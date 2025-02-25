use crate::activity_notifications::handle_activity_notification;
use crate::{mutate_state, run_regular_jobs, RuntimeState};
use canister_api_macros::update_candid_and_msgpack;
use canister_tracing_macros::trace;
use chat_events::Reader;
use community_canister::add_reaction::{Response::*, *};
use group_chat_core::{AddRemoveReactionResult, GroupChatCore};
use types::{ChannelReactionAddedNotification, EventIndex, EventWrapper, Message, Notification, UserId};

#[update_candid_and_msgpack]
#[trace]
fn add_reaction(args: Args) -> Response {
    run_regular_jobs();

    mutate_state(|state| add_reaction_impl(args, state))
}

fn add_reaction_impl(args: Args, state: &mut RuntimeState) -> Response {
    if state.data.is_frozen() {
        return CommunityFrozen;
    }

    let caller = state.env.caller();
    if let Some(member) = state.data.members.get(caller) {
        if member.suspended.value {
            return UserSuspended;
        }

        let user_id = member.user_id;

        if let Some(channel) = state.data.channels.get_mut(&args.channel_id) {
            let now = state.env.now();
            match channel.chat.add_reaction(
                user_id,
                args.thread_root_message_index,
                args.message_id,
                args.reaction.clone(),
                now,
            ) {
                AddRemoveReactionResult::Success => {
                    if let Some(message) = should_push_notification(&args, user_id, &channel.chat) {
                        push_notification(
                            args,
                            user_id,
                            channel.chat.name.value.clone(),
                            channel.chat.avatar.as_ref().map(|d| d.id),
                            message,
                            member.display_name().value.clone(),
                            state,
                        );
                    }
                    handle_activity_notification(state);
                    Success
                }
                AddRemoveReactionResult::NoChange => NoChange,
                AddRemoveReactionResult::InvalidReaction => InvalidReaction,
                AddRemoveReactionResult::MessageNotFound => MessageNotFound,
                AddRemoveReactionResult::UserNotInGroup => UserNotInChannel,
                AddRemoveReactionResult::NotAuthorized => NotAuthorized,
                AddRemoveReactionResult::UserSuspended => UserSuspended,
            }
        } else {
            ChannelNotFound
        }
    } else {
        UserNotInCommunity
    }
}

fn should_push_notification(args: &Args, user_id: UserId, chat: &GroupChatCore) -> Option<EventWrapper<Message>> {
    let message = chat
        .events
        .events_reader(EventIndex::default(), args.thread_root_message_index)
        // We pass in `None` in place of `my_user_id` because we don't want to hydrate
        // the notification with data for the current user (eg. their poll votes).
        .and_then(|events_reader| events_reader.message_event(args.message_id.into(), None))?;

    let sender = message.event.sender;

    if sender != user_id {
        let notifications_muted = chat
            .members
            .get(&sender)
            .map_or(true, |m| m.notifications_muted.value || m.suspended.value);

        if !notifications_muted {
            return Some(message);
        }
    }

    None
}

fn push_notification(
    args: Args,
    user_id: UserId,
    channel_name: String,
    channel_avatar_id: Option<u128>,
    message_event: EventWrapper<Message>,
    member_display_name: Option<String>,
    state: &mut RuntimeState,
) {
    let recipient = message_event.event.sender;
    let notification = Notification::ChannelReactionAdded(ChannelReactionAddedNotification {
        community_id: state.env.canister_id().into(),
        channel_id: args.channel_id,
        thread_root_message_index: args.thread_root_message_index,
        message_index: message_event.event.message_index,
        message_event_index: message_event.index,
        community_name: state.data.name.clone(),
        channel_name,
        added_by: user_id,
        added_by_name: args.username,
        added_by_display_name: member_display_name.or(args.display_name),
        reaction: args.reaction,
        community_avatar_id: state.data.avatar.as_ref().map(|d| d.id),
        channel_avatar_id,
    });

    state.push_notification(vec![recipient], notification);
}
