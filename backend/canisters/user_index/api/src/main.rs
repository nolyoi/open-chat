use candid_gen::generate_candid_method;

#[allow(deprecated)]
fn main() {
    generate_candid_method!(user_index, check_username, query);
    generate_candid_method!(user_index, current_user, query);
    generate_candid_method!(user_index, diamond_membership_fees, query);
    generate_candid_method!(user_index, platform_moderators, query);
    generate_candid_method!(user_index, platform_moderators_group, query);
    generate_candid_method!(user_index, platform_operators, query);
    generate_candid_method!(user_index, referral_leaderboard, query);
    generate_candid_method!(user_index, referral_metrics, query);
    generate_candid_method!(user_index, search, query);
    generate_candid_method!(user_index, suspected_bots, query);
    generate_candid_method!(user_index, user, query);
    generate_candid_method!(user_index, user_registration_canister, query);
    generate_candid_method!(user_index, users, query);
    generate_candid_method!(user_index, users_v2, query);

    generate_candid_method!(user_index, add_platform_moderator, update);
    generate_candid_method!(user_index, add_platform_operator, update);
    generate_candid_method!(user_index, add_referral_codes, update);
    generate_candid_method!(user_index, assign_platform_moderators_group, update);
    generate_candid_method!(user_index, mark_suspected_bot, update);
    generate_candid_method!(user_index, pay_for_diamond_membership, update);
    generate_candid_method!(user_index, remove_platform_moderator, update);
    generate_candid_method!(user_index, remove_platform_operator, update);
    generate_candid_method!(user_index, set_display_name, update);
    generate_candid_method!(user_index, set_user_upgrade_concurrency, update);
    generate_candid_method!(user_index, set_moderation_flags, update);
    generate_candid_method!(user_index, set_username, update);
    generate_candid_method!(user_index, suspend_user, update);
    generate_candid_method!(user_index, unsuspend_user, update);

    candid::export_service!();
    std::print!("{}", __export_service());
}
