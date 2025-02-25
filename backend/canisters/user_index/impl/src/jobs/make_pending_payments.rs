use crate::model::pending_payments_queue::{PendingPayment, PendingPaymentReason};
use crate::LocalUserIndexEvent;
use crate::{mutate_state, RuntimeState};
use ic_cdk_timers::TimerId;
use ic_ledger_types::{BlockIndex, Tokens};
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::TransferArg;
use local_user_index_canister::OpenChatBotMessage;
use serde::Serialize;
use std::cell::Cell;
use std::time::Duration;
use tracing::{error, trace};
use types::{Cryptocurrency, MessageContent, TextContent};
use utils::consts::SNS_ROOT_CANISTER_ID;

thread_local! {
    static TIMER_ID: Cell<Option<TimerId>> = Cell::default();
}

pub(crate) fn start_job_if_required(state: &RuntimeState) -> bool {
    if TIMER_ID.get().is_none() && !state.data.pending_payments_queue.is_empty() {
        let timer_id = ic_cdk_timers::set_timer_interval(Duration::ZERO, run);
        TIMER_ID.set(Some(timer_id));
        trace!("'make_pending_payments' job started");
        true
    } else {
        false
    }
}

pub fn run() {
    if let Some(pending_payment) = mutate_state(|state| state.data.pending_payments_queue.pop()) {
        ic_cdk::spawn(process_payment(pending_payment));
    } else if let Some(timer_id) = TIMER_ID.take() {
        ic_cdk_timers::clear_timer(timer_id);
        trace!("'make_pending_payments' job stopped");
    }
}

async fn process_payment(pending_payment: PendingPayment) {
    let reason = pending_payment.reason.clone();
    match make_payment(&pending_payment).await {
        Ok(block_index) => {
            if matches!(reason, PendingPaymentReason::ReferralReward) {
                mutate_state(|state| inform_referrer(&pending_payment, block_index, state));
            }
        }
        Err(retry) => {
            if retry {
                mutate_state(|state| {
                    state.data.pending_payments_queue.push(pending_payment);
                    start_job_if_required(state);
                });
            }
        }
    }
}

// Error response contains a boolean stating if the transfer should be retried
async fn make_payment(pending_payment: &PendingPayment) -> Result<BlockIndex, bool> {
    let to = Account::from(pending_payment.recipient);

    let args = TransferArg {
        from_subaccount: None,
        to,
        fee: None,
        created_at_time: Some(pending_payment.timestamp),
        memo: Some(pending_payment.memo.to_vec().try_into().unwrap()),
        amount: pending_payment.amount.into(),
    };

    match icrc_ledger_canister_c2c_client::icrc1_transfer(pending_payment.currency.ledger_canister_id().unwrap(), &args).await {
        Ok(Ok(block_index)) => Ok(block_index.0.try_into().unwrap()),
        Ok(Err(transfer_error)) => {
            error!(?transfer_error, ?args, "Transfer failed");
            Err(false)
        }
        Err(error) => {
            error!(?error, ?args, "Transfer failed");
            Err(true)
        }
    }
}

fn inform_referrer(pending_payment: &PendingPayment, block_index: BlockIndex, state: &mut RuntimeState) {
    let user_id = pending_payment.recipient.into();
    let amount = Tokens::from_e8s(pending_payment.amount);
    let symbol = pending_payment.currency.token_symbol();
    let mut amount_text = format!("{} {}", amount, symbol);

    if matches!(pending_payment.currency, Cryptocurrency::CHAT) {
        let link = format!(
            "https://dashboard.internetcomputer.org/sns/{}/transaction/{}",
            SNS_ROOT_CANISTER_ID, block_index
        );
        amount_text = format!("[{}]({})", amount_text, link);
    }

    let message = MessageContent::Text(TextContent { text: format!("You have received a referral reward of {}. This is because one of the users you referred has made a Diamond membership payment.", amount_text) });

    state.push_event_to_local_user_index(
        user_id,
        LocalUserIndexEvent::OpenChatBotMessage(Box::new(OpenChatBotMessage { user_id, message })),
    );
}

#[derive(Serialize)]
struct Link {
    url: String,
    caption: String,
}
