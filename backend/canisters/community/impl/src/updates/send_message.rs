use crate::activity_notifications::handle_activity_notification;
use crate::model::members::CommunityMembers;
use crate::model::user_groups::UserGroup;
use crate::timer_job_types::{DeleteFileReferencesJob, EndPollJob, RefundPrizeJob, RemoveExpiredEventsJob, TimerJob};
use crate::{mutate_state, run_regular_jobs, RuntimeState};
use canister_api_macros::update_candid_and_msgpack;
use canister_timer_jobs::TimerJobs;
use canister_tracing_macros::trace;
use community_canister::send_message::{Response::*, *};
use group_chat_core::SendMessageResult;
use itertools::Itertools;
use lazy_static::lazy_static;
use regex_lite::Regex;
use std::str::FromStr;
use types::{
    ChannelId, ChannelMessageNotification, EventWrapper, Message, MessageContent, MessageContentInitial, MessageIndex,
    Notification, TimestampMillis, UserId,
};

#[update_candid_and_msgpack]
#[trace]
fn send_message(args: Args) -> Response {
    run_regular_jobs();

    mutate_state(|state| send_message_impl(args, state))
}

fn send_message_impl(args: Args, state: &mut RuntimeState) -> Response {
    if state.data.is_frozen() {
        return CommunityFrozen;
    }

    let caller = state.env.caller();
    let now = state.env.now();

    match state.data.members.get_mut(caller) {
        Some(m) => {
            if m.suspended.value {
                return UserSuspended;
            }
            if let Some(version) = args.community_rules_accepted {
                m.accept_rules(version, now);
            }
        }
        None => return UserNotInCommunity,
    };

    let member = state.data.members.get(caller).unwrap();

    if !state.data.check_rules(member) {
        return CommunityRulesNotAccepted;
    }

    if let Some(channel) = state.data.channels.get_mut(&args.channel_id) {
        let user_id = member.user_id;

        let user_groups_mentioned = extract_user_groups_mentioned(&args.content, &state.data.members);
        let mentioned: Vec<_> = args
            .mentioned
            .iter()
            .map(|u| u.user_id)
            .chain(user_groups_mentioned.iter().flat_map(|ug| ug.members.value.iter().copied()))
            .unique()
            .collect();

        match channel.chat.send_message(
            user_id,
            args.thread_root_message_index,
            args.message_id,
            args.content,
            args.replies_to,
            mentioned,
            args.forwarding,
            args.channel_rules_accepted,
            state.data.proposals_bot_user_id,
            now,
        ) {
            SendMessageResult::Success(result) => {
                let event_index = result.message_event.index;
                let message_index = result.message_event.event.message_index;
                let expires_at = result.message_event.expires_at;

                let mut is_next_event_to_expire = false;
                if let Some(expiry) = expires_at {
                    is_next_event_to_expire = state.data.next_event_expiry.map_or(true, |ex| expiry < ex);
                    if is_next_event_to_expire {
                        state.data.next_event_expiry = expires_at;
                    }
                }

                register_timer_jobs(
                    args.channel_id,
                    args.thread_root_message_index,
                    &result.message_event,
                    is_next_event_to_expire,
                    now,
                    &mut state.data.timer_jobs,
                );

                // Exclude suspended members from notification
                let users_to_notify: Vec<UserId> = result
                    .users_to_notify
                    .into_iter()
                    .filter(|u| state.data.members.get_by_user_id(u).map_or(false, |m| !m.suspended.value))
                    .collect();

                let content = &result.message_event.event.content;
                let notification = Notification::ChannelMessage(ChannelMessageNotification {
                    community_id: state.env.canister_id().into(),
                    channel_id: args.channel_id,
                    thread_root_message_index: args.thread_root_message_index,
                    message_index: result.message_event.event.message_index,
                    event_index: result.message_event.index,
                    community_name: state.data.name.clone(),
                    channel_name: channel.chat.name.value.clone(),
                    sender: user_id,
                    sender_name: args.sender_name,
                    sender_display_name: member.display_name().value.clone().or(args.sender_display_name),
                    message_type: content.message_type(),
                    message_text: content.notification_text(
                        &args.mentioned,
                        &user_groups_mentioned
                            .iter()
                            .map(|ug| (ug.id, ug.name.value.clone()))
                            .collect_vec(),
                    ),
                    image_url: content.notification_image_url(),
                    community_avatar_id: state.data.avatar.as_ref().map(|d| d.id),
                    channel_avatar_id: channel.chat.avatar.as_ref().map(|d| d.id),
                    crypto_transfer: content.notification_crypto_transfer_details(&args.mentioned),
                });
                state.push_notification(users_to_notify, notification);

                handle_activity_notification(state);

                Success(SuccessResult {
                    event_index,
                    message_index,
                    timestamp: now,
                    expires_at,
                })
            }
            SendMessageResult::ThreadMessageNotFound => ThreadMessageNotFound,
            SendMessageResult::MessageEmpty => MessageEmpty,
            SendMessageResult::TextTooLong(max_length) => TextTooLong(max_length),
            SendMessageResult::InvalidPoll(reason) => InvalidPoll(reason),
            SendMessageResult::NotAuthorized => NotAuthorized,
            SendMessageResult::UserNotInGroup => UserNotInChannel,
            SendMessageResult::UserSuspended => UserSuspended,
            SendMessageResult::RulesNotAccepted => RulesNotAccepted,
            SendMessageResult::InvalidRequest(error) => InvalidRequest(error),
        }
    } else {
        ChannelNotFound
    }
}

fn register_timer_jobs(
    channel_id: ChannelId,
    thread_root_message_index: Option<MessageIndex>,
    message_event: &EventWrapper<Message>,
    is_next_event_to_expire: bool,
    now: TimestampMillis,
    timer_jobs: &mut TimerJobs<TimerJob>,
) {
    if let MessageContent::Poll(p) = &message_event.event.content {
        if let Some(end_date) = p.config.end_date {
            timer_jobs.enqueue_job(
                TimerJob::EndPoll(EndPollJob {
                    channel_id,
                    thread_root_message_index,
                    message_index: message_event.event.message_index,
                }),
                end_date,
                now,
            );
        }
    }

    let files = message_event.event.content.blob_references();
    if !files.is_empty() {
        if let Some(expiry) = message_event.expires_at {
            timer_jobs.enqueue_job(TimerJob::DeleteFileReferences(DeleteFileReferencesJob { files }), expiry, now);
        }
    }

    if let MessageContent::Prize(p) = &message_event.event.content {
        timer_jobs.enqueue_job(
            TimerJob::RefundPrize(RefundPrizeJob {
                channel_id,
                thread_root_message_index,
                message_index: message_event.event.message_index,
            }),
            p.end_date,
            now,
        );
    }

    if let Some(expiry) = message_event.expires_at.filter(|_| is_next_event_to_expire) {
        timer_jobs.cancel_jobs(|j| matches!(j, TimerJob::RemoveExpiredEvents(_)));
        timer_jobs.enqueue_job(TimerJob::RemoveExpiredEvents(RemoveExpiredEventsJob), expiry, now);
    }
}

lazy_static! {
    static ref USER_GROUP_REGEX: Regex = Regex::new(r"@UserGroup\((\d+)\)").unwrap();
}

fn extract_user_groups_mentioned<'a>(content: &MessageContentInitial, members: &'a CommunityMembers) -> Vec<&'a UserGroup> {
    if let Some(text) = content.text() {
        if text.contains("@UserGroup") {
            return USER_GROUP_REGEX
                .captures_iter(text)
                .filter_map(|c| c.get(1))
                .filter_map(|m| u32::from_str(m.as_str()).ok())
                .filter_map(|id| members.get_user_group(id))
                .collect();
        }
    }

    Vec::new()
}
