use candid::CandidType;
use serde::{Deserialize, Serialize};
use types::{CanisterId, Cryptocurrency, MessageId, MessageIndex};

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct Args {
    pub thread_root_message_index: Option<MessageIndex>,
    pub message_id: MessageId,
    pub ledger: CanisterId,
    pub token: Cryptocurrency,
    pub amount: u128,
    #[serde(default = "eight")]
    pub decimals: u8,
    pub username: String,
    pub display_name: Option<String>,
    pub user_avatar_id: Option<u128>,
}

fn eight() -> u8 {
    8
}

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub enum Response {
    Success,
}
