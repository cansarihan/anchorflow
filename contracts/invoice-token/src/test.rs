#![cfg(test)]
//! InvoiceToken unit tests — Author: Can Sarıhan

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, BytesN, Env,
};

fn setup() -> (Env, InvoiceTokenClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceToken, ());
    let client = InvoiceTokenClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.init(&admin);
    (env, client, admin)
}

fn sample_invoice(
    env: &Env,
    client: &InvoiceTokenClient,
) -> (u64, Address, Address, Address) {
    let issuer = Address::generate(env);
    let payer = Address::generate(env);
    let asset = Address::generate(env);
    let doc_hash = BytesN::from_array(env, &[7u8; 32]);
    let id = client.mint(&issuer, &payer, &1_000_0000000i128, &asset, &5000u32, &doc_hash);
    (id, issuer, payer, asset)
}

#[test]
fn test_mint_creates_pending_invoice() {
    let (env, client, _admin) = setup();
    let (id, issuer, _payer, _asset) = sample_invoice(&env, &client);
    assert_eq!(id, 1);
    let inv = client.get(&id);
    assert_eq!(inv.status, Status::Pending);
    assert_eq!(inv.amount, 1_000_0000000i128);
    let owned = client.owned_by(&issuer);
    assert_eq!(owned.len(), 1);
}

#[test]
fn test_accept_moves_to_accepted() {
    let (env, client, _admin) = setup();
    let (id, _issuer, _payer, _asset) = sample_invoice(&env, &client);
    client.accept(&id);
    assert_eq!(client.get(&id).status, Status::Accepted);
}

#[test]
fn test_pool_lifecycle() {
    let (env, client, _admin) = setup();
    let pool = Address::generate(&env);
    client.set_pool(&pool);

    let (id, _issuer, _payer, _asset) = sample_invoice(&env, &client);
    client.accept(&id);
    client.mark_financed(&id);
    assert_eq!(client.get(&id).status, Status::Financed);
    client.mark_paid(&id);
    assert_eq!(client.get(&id).status, Status::Paid);
}

#[test]
fn test_counter_increments() {
    let (env, client, _admin) = setup();
    let (id1, _, _, _) = sample_invoice(&env, &client);
    let (id2, _, _, _) = sample_invoice(&env, &client);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
#[should_panic]
fn test_double_init_fails() {
    let (_env, client, admin) = setup();
    client.init(&admin);
}

#[test]
#[should_panic]
fn test_financed_requires_accepted() {
    let (env, client, _admin) = setup();
    let pool = Address::generate(&env);
    client.set_pool(&pool);
    let (id, _, _, _) = sample_invoice(&env, &client);
    // accept skipped — cannot go directly from Pending to financed
    client.mark_financed(&id);
}
