use candid::{CandidType, Principal};
use canister_state_macros::canister_state;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashSet;
use types::{
    BuildVersion, CanisterId, CompletedCryptoTransaction, Cryptocurrency, Cycles, Document, TimestampMillis, Timestamped,
};
use utils::env::Environment;

mod guards;
mod jobs;
mod lifecycle;
mod memory;
mod queries;
mod updates;

thread_local! {
    static WASM_VERSION: RefCell<Timestamped<BuildVersion>> = RefCell::default();
}

canister_state!(RuntimeState);

struct RuntimeState {
    pub env: Box<dyn Environment>,
    pub data: Data,
}

impl RuntimeState {
    pub fn new(env: Box<dyn Environment>, data: Data) -> RuntimeState {
        RuntimeState { env, data }
    }

    pub fn is_caller_admin(&self) -> bool {
        let caller = self.env.caller();
        self.data.admins.contains(&caller)
    }

    pub fn metrics(&self) -> Metrics {
        Metrics {
            memory_used: utils::memory::used(),
            now: self.env.now(),
            cycles_balance: self.env.cycles_balance(),
            wasm_version: WASM_VERSION.with_borrow(|v| **v),
            git_commit_id: utils::git::git_commit_id().to_string(),
            mean_time_between_prizes: self.data.mean_time_between_prizes,
            started: self.data.started,
            username: self.data.username.clone(),
            token: self.data.prize_data.as_ref().map(|p| p.token.clone()),
            ledger_canister_id: self.data.prize_data.as_ref().map(|p| p.ledger_canister_id),
            end_date: self.data.prize_data.as_ref().map(|p| p.end_date),
            group_count: self.data.groups.len(),
            total_value_sent: self.data.prizes_sent.iter().map(|p| p.transaction.units() as u64).sum(),
            prizes_sent: self.data.prizes_sent.len() as u32,
        }
    }

    pub fn pick_random_group(&mut self) -> Option<CanisterId> {
        let num_groups = self.data.groups.len();
        if num_groups == 0 {
            return None;
        }

        let rnd = self.env.rng().next_u32() as usize;
        if rnd % 3 == 0 {
            Some(Principal::from_text("vmdca-pqaaa-aaaaf-aabzq-cai").unwrap())
        } else {
            let rnd_group_index = rnd % num_groups;
            let group_vec: Vec<_> = self.data.groups.iter().copied().collect();
            Some(group_vec[rnd_group_index])
        }
    }
}

#[derive(Serialize, Deserialize)]
struct Data {
    pub user_index_canister_id: CanisterId,
    pub admins: HashSet<Principal>,
    pub avatar: Timestamped<Option<Document>>,
    pub test_mode: bool,
    pub username: String,
    pub prize_data: Option<PrizeData>,
    pub mean_time_between_prizes: TimestampMillis,
    pub prizes_sent: Vec<Prize>,
    pub groups: HashSet<CanisterId>,
    pub started: bool,
    #[serde(default)]
    pub rng_seed: [u8; 32],
}

impl Data {
    pub fn new(user_index_canister_id: CanisterId, admins: HashSet<Principal>, test_mode: bool) -> Data {
        Data {
            user_index_canister_id,
            admins,
            avatar: Timestamped::default(),
            test_mode,
            username: "PrizeBot".to_string(),
            prize_data: None,
            mean_time_between_prizes: 3_600_000,
            prizes_sent: Vec::new(),
            groups: HashSet::new(),
            started: false,
            rng_seed: [0; 32],
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct PrizeData {
    pub token: Cryptocurrency,
    pub ledger_canister_id: CanisterId,
    pub prizes: Vec<Vec<u64>>,
    pub end_date: TimestampMillis,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Prize {
    pub group: CanisterId,
    pub transaction: CompletedCryptoTransaction,
}

#[derive(CandidType, Serialize, Debug)]
pub struct Metrics {
    pub now: TimestampMillis,
    pub memory_used: u64,
    pub cycles_balance: Cycles,
    pub wasm_version: BuildVersion,
    pub git_commit_id: String,
    pub mean_time_between_prizes: TimestampMillis,
    pub started: bool,
    pub username: String,
    pub token: Option<Cryptocurrency>,
    pub ledger_canister_id: Option<CanisterId>,
    pub end_date: Option<TimestampMillis>,
    pub group_count: usize,
    pub total_value_sent: u64,
    pub prizes_sent: u32,
}
