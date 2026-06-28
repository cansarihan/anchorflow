#![cfg(test)]
//! LendingPool integration tests — end-to-end financing flow.
//! Author: Can Sarıhan

use super::*;
use invoice_token::{InvoiceToken, InvoiceTokenClient};
use soroban_sdk::{
    testutils::Address as _,
    token, Address, BytesN, Env,
};

struct Fixture<'a> {
    env: Env,
    pool: LendingPoolClient<'a>,
    invoices: InvoiceTokenClient<'a>,
    asset: Address,
    asset_admin: token::StellarAssetClient<'a>,
    issuer: Address,
    payer: Address,
}

fn setup() -> Fixture<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);

    // Stellar Asset Contract playing the role of USDC testnet.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let asset = sac.address();
    let asset_admin = token::StellarAssetClient::new(&env, &asset);

    // InvoiceToken
    let inv_id = env.register(InvoiceToken, ());
    let invoices = InvoiceTokenClient::new(&env, &inv_id);
    invoices.init(&admin);

    // LendingPool: 85% advance, 200 bps (2%) fee
    let pool_id = env.register(LendingPool, ());
    let pool = LendingPoolClient::new(&env, &pool_id);
    pool.init(&admin, &asset, &inv_id, &8500u32, &200u32);

    // Authorize the pool so it can mark invoices financed/paid.
    invoices.set_pool(&pool_id);

    let issuer = Address::generate(&env);
    let payer = Address::generate(&env);

    Fixture {
        env,
        pool,
        invoices,
        asset,
        asset_admin,
        issuer,
        payer,
    }
}

fn mint_invoice(f: &Fixture, amount: i128) -> u64 {
    let doc_hash = BytesN::from_array(&f.env, &[1u8; 32]);
    f.invoices
        .mint(&f.issuer, &f.payer, &amount, &f.asset, &5000u32, &doc_hash)
}

#[test]
fn test_full_financing_flow() {
    let f = setup();
    let token = token::Client::new(&f.env, &f.asset);

    // The LP deposits 10,000 USDC into the pool.
    let lp = Address::generate(&f.env);
    f.asset_admin.mint(&lp, &10_000_0000000i128);
    f.pool.deposit(&lp, &10_000_0000000i128);

    let (liq, borrowed, util) = f.pool.pool_stats();
    assert_eq!(liq, 10_000_0000000i128);
    assert_eq!(borrowed, 0);
    assert_eq!(util, 0);

    // The freelancer issues a 1,000 USDC invoice, the customer accepts it.
    let invoice_id = mint_invoice(&f, 1_000_0000000i128);
    f.invoices.accept(&invoice_id);

    // Draw the advance: 85% = 850 USDC instantly.
    let advance = f.pool.borrow(&invoice_id);
    assert_eq!(advance, 850_0000000i128);
    assert_eq!(token.balance(&f.issuer), 850_0000000i128);

    // Fund the customer with the invoice amount so they can pay the invoice.
    f.asset_admin.mint(&f.payer, &1_000_0000000i128);
    f.pool.repay(&f.payer, &invoice_id);

    // Loan closed, invoice Paid.
    assert_eq!(f.pool.get_loan(&invoice_id).status, LoanStatus::Repaid);
    assert_eq!(
        f.invoices.get(&invoice_id).status,
        invoice_token::Status::Paid
    );

    // Borrower total: 850 (advance) + remainder (1000 - 850 - 20 fee = 130) = 980.
    assert_eq!(token.balance(&f.issuer), 980_0000000i128);

    // Pool: grew by the fee (20 USDC) → LP yield.
    let (liq_after, borrowed_after, _) = f.pool.pool_stats();
    assert_eq!(liq_after, 10_020_0000000i128);
    assert_eq!(borrowed_after, 0);
}

#[test]
fn test_lp_yield_realized_on_withdraw() {
    let f = setup();

    let lp = Address::generate(&f.env);
    f.asset_admin.mint(&lp, &10_000_0000000i128);
    let shares = f.pool.deposit(&lp, &10_000_0000000i128);

    let invoice_id = mint_invoice(&f, 1_000_0000000i128);
    f.invoices.accept(&invoice_id);
    f.pool.borrow(&invoice_id);
    f.asset_admin.mint(&f.payer, &1_000_0000000i128);
    f.pool.repay(&f.payer, &invoice_id);

    // The single LP withdraws all shares — should receive 10,020 including the fee.
    let token = token::Client::new(&f.env, &f.asset);
    let withdrawn = f.pool.withdraw(&lp, &shares);
    assert_eq!(withdrawn, 10_020_0000000i128);
    assert_eq!(token.balance(&lp), 10_020_0000000i128);
}

#[test]
#[should_panic]
fn test_borrow_requires_accepted_invoice() {
    let f = setup();
    let lp = Address::generate(&f.env);
    f.asset_admin.mint(&lp, &10_000_0000000i128);
    f.pool.deposit(&lp, &10_000_0000000i128);

    let invoice_id = mint_invoice(&f, 1_000_0000000i128);
    // accept skipped → borrow should fail.
    f.pool.borrow(&invoice_id);
}

#[test]
#[should_panic]
fn test_borrow_insufficient_liquidity() {
    let f = setup();
    // No liquidity in the pool.
    let invoice_id = mint_invoice(&f, 1_000_0000000i128);
    f.invoices.accept(&invoice_id);
    f.pool.borrow(&invoice_id);
}
