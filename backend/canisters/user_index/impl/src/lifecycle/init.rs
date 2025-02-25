use crate::lifecycle::{init_env, init_state};
use crate::Data;
use canister_tracing_macros::trace;
use ic_cdk_macros::init;
use tracing::info;
use user_index_canister::init::Args;
use utils::cycles::init_cycles_dispenser_client;

#[init]
#[trace]
fn init(args: Args) {
    canister_logger::init(args.test_mode);
    init_cycles_dispenser_client(args.cycles_dispenser_canister_id);

    let env = init_env([0; 32]);

    let data = Data::new(
        args.service_principals,
        args.user_canister_wasm,
        args.local_user_index_canister_wasm,
        args.group_index_canister_id,
        args.notifications_index_canister_id,
        args.proposals_bot_canister_id,
        args.cycles_dispenser_canister_id,
        args.storage_index_canister_id,
        args.internet_identity_canister_id,
        args.test_mode,
    );

    init_state(env, data, args.wasm_version);

    info!(version = %args.wasm_version, "Initialization complete");
}
