use candid_gen::generate_candid_method;

#[allow(deprecated)]
fn main() {
    generate_candid_method!(user, bio, query);
    generate_candid_method!(user, contacts, query);
    generate_candid_method!(user, deleted_message, query);
    generate_candid_method!(user, events, query);
    generate_candid_method!(user, events_by_index, query);
    generate_candid_method!(user, events_window, query);
    generate_candid_method!(user, hot_group_exclusions, query);
    generate_candid_method!(user, initial_state, query);
    generate_candid_method!(user, messages_by_message_index, query);
    generate_candid_method!(user, public_profile, query);
    generate_candid_method!(user, search_messages, query);
    generate_candid_method!(user, saved_crypto_accounts, query);
    generate_candid_method!(user, token_swap_status, query);
    generate_candid_method!(user, updates, query);

    generate_candid_method!(user, add_hot_group_exclusions, update);
    generate_candid_method!(user, add_reaction, update);
    generate_candid_method!(user, approve_transfer, update);
    generate_candid_method!(user, archive_unarchive_chats, update);
    generate_candid_method!(user, block_user, update);
    generate_candid_method!(user, cancel_message_reminder, update);
    generate_candid_method!(user, create_community, update);
    generate_candid_method!(user, create_group, update);
    generate_candid_method!(user, delete_community, update);
    generate_candid_method!(user, delete_direct_chat, update);
    generate_candid_method!(user, delete_group, update);
    generate_candid_method!(user, delete_messages, update);
    generate_candid_method!(user, edit_message_v2, update);
    generate_candid_method!(user, init_user_principal_migration, update);
    generate_candid_method!(user, leave_community, update);
    generate_candid_method!(user, leave_group, update);
    generate_candid_method!(user, manage_favourite_chats, update);
    generate_candid_method!(user, mark_read, update);
    generate_candid_method!(user, migrate_user_principal, update);
    generate_candid_method!(user, mute_notifications, update);
    generate_candid_method!(user, pin_chat_v2, update);
    generate_candid_method!(user, remove_reaction, update);
    generate_candid_method!(user, report_message, update);
    generate_candid_method!(user, save_crypto_account, update);
    generate_candid_method!(user, send_message_with_transfer_to_channel, update);
    generate_candid_method!(user, send_message_with_transfer_to_group, update);
    generate_candid_method!(user, send_message_v2, update);
    generate_candid_method!(user, set_avatar, update);
    generate_candid_method!(user, set_bio, update);
    generate_candid_method!(user, set_community_indexes, update);
    generate_candid_method!(user, set_contact, update);
    generate_candid_method!(user, set_message_reminder_v2, update);
    generate_candid_method!(user, submit_proposal, update);
    generate_candid_method!(user, swap_tokens, update);
    generate_candid_method!(user, tip_message, update);
    generate_candid_method!(user, unblock_user, update);
    generate_candid_method!(user, undelete_messages, update);
    generate_candid_method!(user, unmute_notifications, update);
    generate_candid_method!(user, unpin_chat_v2, update);
    generate_candid_method!(user, withdraw_crypto_v2, update);

    candid::export_service!();
    std::print!("{}", __export_service());
}
