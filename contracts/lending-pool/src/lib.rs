#![no_std]
//! AnchorFlow — LendingPool
//!
//! A permissionless pool that provides instant advances against verified
//! invoices (InvoiceToken). Liquidity providers (LPs) deposit USDC and earn
//! yield backed by real cash flow. When the customer pays the invoice, the
//! loan closes atomically within a single transaction — the off-chain
//! receivable settles deterministically against the on-chain credit.
//!
//! MVP simplifications:
//!  - Single asset (USDC testnet), single pool.
//!  - Flat discount interest model (`fee_bps`), no oracle/FX risk.
//!  - Default: simple marking; full liquidation in Milestone 3.
//!
//! Author: Can Sarıhan

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, vec, Address,
    BytesN, Env, IntoVal, Symbol,
};

/// Local mirror of the InvoiceToken contract's statuses. Because Soroban types
/// are encoded structurally (XDR), this mirror matches exactly in cross-contract
/// calls — so there is no symbol clash in the deployed wasm.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status {
    Pending = 0,
    Accepted = 1,
    Financed = 2,
    Paid = 3,
    Defaulted = 4,
}

/// Local mirror of the InvoiceToken `Invoice` struct (for cross-contract decode).
#[contracttype]
#[derive(Clone)]
pub struct Invoice {
    pub id: u64,
    pub issuer: Address,
    pub payer: Address,
    pub amount: i128,
    pub asset: Address,
    pub due_ledger: u32,
    pub status: Status,
    pub doc_hash: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum LoanStatus {
    Active = 0,
    Repaid = 1,
    Defaulted = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct Loan {
    pub invoice_id: u64,
    pub borrower: Address,
    pub principal: i128,
    pub face_value: i128,
    pub status: LoanStatus,
}

#[contracttype]
pub enum DataKey {
    Admin,
    /// USDC (SAC) asset contract address.
    Asset,
    /// InvoiceToken contract address.
    InvoiceContract,
    /// Advance ratio, basis points (8500 = 85%).
    AdvanceRatio,
    /// Financing discount/interest, basis points.
    FeeBps,
    /// Total deposited liquidity.
    TotalLiquidity,
    /// Principal currently locked in loans.
    TotalBorrowed,
    /// LP -> share amount.
    Shares(Address),
    /// Total share supply.
    TotalShares,
    /// invoice_id -> Loan
    Loan(u64),
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InsufficientLiquidity = 3,
    InvoiceNotAccepted = 4,
    LoanExists = 5,
    LoanNotFound = 6,
    LoanNotActive = 7,
    InvalidAmount = 8,
    Unauthorized = 9,
}

const BPS_DENOMINATOR: i128 = 10_000;

#[contract]
pub struct LendingPool;

#[contractimpl]
impl LendingPool {
    /// Initialize the pool.
    pub fn init(
        env: Env,
        admin: Address,
        asset: Address,
        invoice_contract: Address,
        advance_ratio_bps: u32,
        fee_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        let s = env.storage().instance();
        s.set(&DataKey::Admin, &admin);
        s.set(&DataKey::Asset, &asset);
        s.set(&DataKey::InvoiceContract, &invoice_contract);
        s.set(&DataKey::AdvanceRatio, &advance_ratio_bps);
        s.set(&DataKey::FeeBps, &fee_bps);
        s.set(&DataKey::TotalLiquidity, &0i128);
        s.set(&DataKey::TotalBorrowed, &0i128);
        s.set(&DataKey::TotalShares, &0i128);
        Ok(())
    }

    /// An LP deposits liquidity and receives shares in return.
    pub fn deposit(env: Env, lp: Address, amount: i128) -> Result<i128, Error> {
        lp.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let asset = Self::asset(&env);
        let token = token::Client::new(&env, &asset);
        token.transfer(&lp, &env.current_contract_address(), &amount);

        let total_liq = Self::total_liquidity(&env);
        let total_shares = Self::get_i128(&env, &DataKey::TotalShares);

        // 1:1 on the first deposit; afterwards proportional to current pool value.
        let minted = if total_shares == 0 || total_liq == 0 {
            amount
        } else {
            amount * total_shares / total_liq
        };

        let prev_shares = Self::get_shares(&env, &lp);
        env.storage()
            .persistent()
            .set(&DataKey::Shares(lp), &(prev_shares + minted));
        Self::set_i128(&env, &DataKey::TotalShares, total_shares + minted);
        Self::set_i128(&env, &DataKey::TotalLiquidity, total_liq + amount);
        Ok(minted)
    }

    /// An LP redeems shares and withdraws liquidity.
    pub fn withdraw(env: Env, lp: Address, shares: i128) -> Result<i128, Error> {
        lp.require_auth();
        if shares <= 0 {
            return Err(Error::InvalidAmount);
        }
        let lp_shares = Self::get_shares(&env, &lp);
        if shares > lp_shares {
            return Err(Error::InvalidAmount);
        }

        let total_shares = Self::get_i128(&env, &DataKey::TotalShares);
        let total_liq = Self::total_liquidity(&env);
        let available = total_liq - Self::get_i128(&env, &DataKey::TotalBorrowed);

        let amount = shares * total_liq / total_shares;
        if amount > available {
            return Err(Error::InsufficientLiquidity);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Shares(lp.clone()), &(lp_shares - shares));
        Self::set_i128(&env, &DataKey::TotalShares, total_shares - shares);
        Self::set_i128(&env, &DataKey::TotalLiquidity, total_liq - amount);

        let token = token::Client::new(&env, &Self::asset(&env));
        token.transfer(&env.current_contract_address(), &lp, &amount);
        Ok(amount)
    }

    /// Draw an advance against an accepted invoice.
    /// Sets the invoice to `Financed` and pays `advance_ratio` of it to the borrower.
    pub fn borrow(env: Env, invoice_id: u64) -> Result<i128, Error> {
        if env.storage().persistent().has(&DataKey::Loan(invoice_id)) {
            return Err(Error::LoanExists);
        }

        let invoice_contract = Self::invoice_contract(&env);
        let invoice = Self::invoice_get(&env, &invoice_contract, invoice_id);

        if invoice.status != Status::Accepted {
            return Err(Error::InvoiceNotAccepted);
        }
        invoice.issuer.require_auth();

        let advance_ratio = Self::get_u32(&env, &DataKey::AdvanceRatio) as i128;
        let principal = invoice.amount * advance_ratio / BPS_DENOMINATOR;

        let total_liq = Self::total_liquidity(&env);
        let borrowed = Self::get_i128(&env, &DataKey::TotalBorrowed);
        if principal > total_liq - borrowed {
            return Err(Error::InsufficientLiquidity);
        }

        // Lock the invoice as collateral (cross-contract, with pool authority).
        Self::invoice_mark_financed(&env, &invoice_contract, invoice_id);

        let loan = Loan {
            invoice_id,
            borrower: invoice.issuer.clone(),
            principal,
            face_value: invoice.amount,
            status: LoanStatus::Active,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Loan(invoice_id), &loan);
        Self::set_i128(&env, &DataKey::TotalBorrowed, borrowed + principal);

        let token = token::Client::new(&env, &Self::asset(&env));
        token.transfer(&env.current_contract_address(), &invoice.issuer, &principal);
        Ok(principal)
    }

    /// The customer pays the invoice; the loan closes atomically.
    /// Principal + fee go to the pool, the remainder (face - principal) to the
    /// borrower; the fee becomes LP yield.
    pub fn repay(env: Env, payer: Address, invoice_id: u64) -> Result<(), Error> {
        payer.require_auth();
        let mut loan: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(invoice_id))
            .ok_or(Error::LoanNotFound)?;
        if loan.status != LoanStatus::Active {
            return Err(Error::LoanNotActive);
        }

        let token = token::Client::new(&env, &Self::asset(&env));
        // The customer pays the full face value of the invoice to the pool.
        token.transfer(&payer, &env.current_contract_address(), &loan.face_value);

        // The borrower receives the remainder of the invoice value (face - principal) minus the fee.
        let fee_bps = Self::get_u32(&env, &DataKey::FeeBps) as i128;
        let fee = loan.face_value * fee_bps / BPS_DENOMINATOR;
        let remainder = loan.face_value - loan.principal - fee;

        if remainder > 0 {
            token.transfer(&env.current_contract_address(), &loan.borrower, &remainder);
        }

        // Principal freed; fee stays in the pool → LP yield (TotalLiquidity increases).
        let borrowed = Self::get_i128(&env, &DataKey::TotalBorrowed);
        Self::set_i128(&env, &DataKey::TotalBorrowed, borrowed - loan.principal);
        let total_liq = Self::total_liquidity(&env);
        Self::set_i128(&env, &DataKey::TotalLiquidity, total_liq + fee);

        loan.status = LoanStatus::Repaid;
        env.storage()
            .persistent()
            .set(&DataKey::Loan(invoice_id), &loan);

        Self::invoice_mark_paid(&env, &Self::invoice_contract(&env), invoice_id);
        Ok(())
    }

    /// Pool statistics: (liquidity, borrowed, utilization_bps).
    pub fn pool_stats(env: Env) -> (i128, i128, u32) {
        let liq = Self::total_liquidity(&env);
        let borrowed = Self::get_i128(&env, &DataKey::TotalBorrowed);
        let util = if liq > 0 {
            (borrowed * BPS_DENOMINATOR / liq) as u32
        } else {
            0
        };
        (liq, borrowed, util)
    }

    pub fn get_loan(env: Env, invoice_id: u64) -> Result<Loan, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Loan(invoice_id))
            .ok_or(Error::LoanNotFound)
    }

    pub fn shares_of(env: Env, lp: Address) -> i128 {
        Self::get_shares(&env, &lp)
    }

    // --- cross-contract calls (InvoiceToken) ---

    fn invoice_get(env: &Env, contract: &Address, id: u64) -> Invoice {
        env.invoke_contract(
            contract,
            &symbol_short!("get"),
            vec![env, id.into_val(env)],
        )
    }

    fn invoice_mark_financed(env: &Env, contract: &Address, id: u64) {
        env.invoke_contract::<()>(
            contract,
            &Symbol::new(env, "mark_financed"),
            vec![env, id.into_val(env)],
        );
    }

    fn invoice_mark_paid(env: &Env, contract: &Address, id: u64) {
        env.invoke_contract::<()>(
            contract,
            &Symbol::new(env, "mark_paid"),
            vec![env, id.into_val(env)],
        );
    }

    // --- internal helpers ---

    fn asset(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Asset).unwrap()
    }

    fn invoice_contract(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::InvoiceContract)
            .unwrap()
    }

    fn total_liquidity(env: &Env) -> i128 {
        Self::get_i128(env, &DataKey::TotalLiquidity)
    }

    fn get_i128(env: &Env, key: &DataKey) -> i128 {
        env.storage().instance().get(key).unwrap_or(0)
    }

    fn set_i128(env: &Env, key: &DataKey, val: i128) {
        env.storage().instance().set(key, &val);
    }

    fn get_u32(env: &Env, key: &DataKey) -> u32 {
        env.storage().instance().get(key).unwrap_or(0)
    }

    fn get_shares(env: &Env, lp: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Shares(lp.clone()))
            .unwrap_or(0)
    }
}

mod test;
