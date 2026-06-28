#![cfg(test)]
//! PayrollStream tests — linear vesting + token streaming. Author: Can Sarıhan

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, token, Address, Env};

struct Fx<'a> {
    env: Env,
    client: PayrollStreamClient<'a>,
    asset: Address,
    asset_admin: token::StellarAssetClient<'a>,
    employer: Address,
    employee: Address,
}

fn setup() -> Fx<'static> {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let asset = sac.address();
    let asset_admin = token::StellarAssetClient::new(&env, &asset);

    let id = env.register(PayrollStream, ());
    let client = PayrollStreamClient::new(&env, &id);

    let employer = Address::generate(&env);
    let employee = Address::generate(&env);
    asset_admin.mint(&employer, &10_000_0000000i128);

    env.ledger().set_sequence_number(100);
    Fx { env, client, asset, asset_admin, employer, employee }
}

fn new_stream(fx: &Fx) -> u64 {
    // total 1000, start 100, end 200 (a 100-ledger stream)
    fx.client.create_stream(
        &fx.employer,
        &fx.employee,
        &fx.asset,
        &1_000_0000000i128,
        &100u32,
        &200u32,
    )
}

#[test]
fn test_create_escrows_funds() {
    let fx = setup();
    let id = new_stream(&fx);
    let token = token::Client::new(&fx.env, &fx.asset);
    // The employer locked 1000 out of 10000.
    assert_eq!(token.balance(&fx.employer), 9_000_0000000i128);
    assert_eq!(fx.client.get_stream(&id).status, StreamStatus::Active);
}

#[test]
fn test_linear_vesting() {
    let fx = setup();
    let id = new_stream(&fx);
    assert_eq!(fx.client.vested(&id), 0); // 0 at the start
    fx.env.ledger().set_sequence_number(150); // halfway
    assert_eq!(fx.client.vested(&id), 500_0000000i128);
    fx.env.ledger().set_sequence_number(200); // fully
    assert_eq!(fx.client.vested(&id), 1_000_0000000i128);
    fx.env.ledger().set_sequence_number(250); // capped after the end
    assert_eq!(fx.client.vested(&id), 1_000_0000000i128);
}

#[test]
fn test_withdraw_vested() {
    let fx = setup();
    let id = new_stream(&fx);
    let token = token::Client::new(&fx.env, &fx.asset);

    fx.env.ledger().set_sequence_number(150);
    let w = fx.client.withdraw(&id);
    assert_eq!(w, 500_0000000i128);
    assert_eq!(token.balance(&fx.employee), 500_0000000i128);

    // Withdraw the remainder at the end.
    fx.env.ledger().set_sequence_number(200);
    assert_eq!(fx.client.withdrawable(&id), 500_0000000i128);
    let w2 = fx.client.withdraw(&id);
    assert_eq!(w2, 500_0000000i128);
    assert_eq!(token.balance(&fx.employee), 1_000_0000000i128);
    assert_eq!(fx.client.get_stream(&id).status, StreamStatus::Completed);
}

#[test]
fn test_cancel_splits_funds() {
    let fx = setup();
    let id = new_stream(&fx);
    let token = token::Client::new(&fx.env, &fx.asset);

    fx.env.ledger().set_sequence_number(150); // cancel halfway
    fx.client.cancel(&id);

    // The employee gets the vested 500, the employer gets back the remaining 500.
    assert_eq!(token.balance(&fx.employee), 500_0000000i128);
    assert_eq!(token.balance(&fx.employer), 9_500_0000000i128);
    assert_eq!(fx.client.get_stream(&id).status, StreamStatus::Cancelled);
}

#[test]
#[should_panic]
fn test_invalid_range() {
    let fx = setup();
    fx.client.create_stream(
        &fx.employer,
        &fx.employee,
        &fx.asset,
        &1_000_0000000i128,
        &200u32,
        &100u32, // end < start
    );
}

#[test]
#[should_panic]
fn test_withdraw_nothing_before_start() {
    let fx = setup();
    let id = new_stream(&fx);
    // ledger is still 100 (start) -> vested 0 -> nothing to withdraw
    fx.client.withdraw(&id);
}
