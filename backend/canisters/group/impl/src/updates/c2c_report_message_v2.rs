use crate::activity_notifications::handle_activity_notification;
use crate::guards::caller_is_user_index_or_local_user_index;
use crate::{mutate_state, run_regular_jobs, RuntimeState};
use canister_api_macros::update_msgpack;
use canister_tracing_macros::trace;
use group_canister::c2c_report_message_v2::{Response::*, *};

#[update_msgpack(guard = "caller_is_user_index_or_local_user_index")]
#[trace]
fn c2c_report_message_v2(args: Args) -> Response {
    run_regular_jobs();

    mutate_state(|state| c2c_report_message_impl(args, state))
}

fn c2c_report_message_impl(args: Args, state: &mut RuntimeState) -> Response {
    let now = state.env.now();

    state.data.chat.events.report_message(
        args.user_id,
        args.chat_id,
        args.thread_root_message_index,
        args.event_index,
        args.reason_code,
        args.notes,
        now,
    );

    handle_activity_notification(state);
    Success
}
