#![no_std]
//! AnchorFlow — InvoiceToken
//!
//! Each verified invoice is represented as a unique RWA (real-world
//! asset) token on Stellar/Soroban. The token's owner is the independent
//! freelancer who issued it (issuer). The LendingPool takes this token as
//! collateral and advances funds against it.
//!
//! Trust model (MVP): `doc_hash` binds the off-chain invoice document to the
//! chain; the `accept` step represents customer approval and is a precondition
//! for financing.
//!
//! Author: Can Sarıhan

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, Vec,
};

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status {
    /// Minted, no customer acceptance yet.
    Pending = 0,
    /// Customer accepted the invoice — eligible for financing.
    Accepted = 1,
    /// LendingPool took collateral, advance paid out.
    Financed = 2,
    /// Customer paid, loan closed.
    Paid = 3,
    /// Past due, unpaid.
    Defaulted = 4,
}

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
pub enum DataKey {
    /// Contract administrator (the deployer).
    Admin,
    /// LendingPool address — only it may call `mark_financed`/`mark_paid`.
    Pool,
    /// Incrementing invoice counter.
    Counter,
    /// id -> Invoice
    Invoice(u64),
    /// issuer -> Vec<u64> (invoice ids belonging to the owner)
    Owned(Address),
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvoiceNotFound = 3,
    Unauthorized = 4,
    InvalidStatus = 5,
    InvalidAmount = 6,
    PoolNotSet = 7,
}

#[contract]
pub struct InvoiceToken;

#[contractimpl]
impl InvoiceToken {
    /// Initialize the contract. The admin can assign the pool address later.
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Counter, &0u64);
        Ok(())
    }

    /// Set the LendingPool contract address (admin only).
    pub fn set_pool(env: Env, pool: Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Pool, &pool);
        Ok(())
    }

    /// Mint a new invoice token. The caller must be the issuer.
    pub fn mint(
        env: Env,
        issuer: Address,
        payer: Address,
        amount: i128,
        asset: Address,
        due_ledger: u32,
        doc_hash: BytesN<32>,
    ) -> Result<u64, Error> {
        issuer.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut counter: u64 = env
            .storage()
            .instance()
            .get(&DataKey::Counter)
            .ok_or(Error::NotInitialized)?;
        counter += 1;

        let invoice = Invoice {
            id: counter,
            issuer: issuer.clone(),
            payer,
            amount,
            asset,
            due_ledger,
            status: Status::Pending,
            doc_hash,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Invoice(counter), &invoice);
        env.storage().instance().set(&DataKey::Counter, &counter);

        let mut owned: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::Owned(issuer.clone()))
            .unwrap_or(Vec::new(&env));
        owned.push_back(counter);
        env.storage()
            .persistent()
            .set(&DataKey::Owned(issuer), &owned);

        Ok(counter)
    }

    /// The customer accepts the invoice — a precondition for financing.
    pub fn accept(env: Env, id: u64) -> Result<(), Error> {
        let mut invoice = Self::load(&env, id)?;
        invoice.payer.require_auth();
        if invoice.status != Status::Pending {
            return Err(Error::InvalidStatus);
        }
        invoice.status = Status::Accepted;
        Self::store(&env, &invoice);
        Ok(())
    }

    /// Mark the invoice as "financed" — only the LendingPool may call this.
    pub fn mark_financed(env: Env, id: u64) -> Result<(), Error> {
        Self::require_pool(&env)?;
        let mut invoice = Self::load(&env, id)?;
        if invoice.status != Status::Accepted {
            return Err(Error::InvalidStatus);
        }
        invoice.status = Status::Financed;
        Self::store(&env, &invoice);
        Ok(())
    }

    /// Mark the invoice as "paid" — only the LendingPool may call this.
    pub fn mark_paid(env: Env, id: u64) -> Result<(), Error> {
        Self::require_pool(&env)?;
        let mut invoice = Self::load(&env, id)?;
        if invoice.status != Status::Financed && invoice.status != Status::Accepted {
            return Err(Error::InvalidStatus);
        }
        invoice.status = Status::Paid;
        Self::store(&env, &invoice);
        Ok(())
    }

    /// Mark the invoice as "defaulted" — only the LendingPool may call this.
    pub fn mark_defaulted(env: Env, id: u64) -> Result<(), Error> {
        Self::require_pool(&env)?;
        let mut invoice = Self::load(&env, id)?;
        if invoice.status != Status::Financed {
            return Err(Error::InvalidStatus);
        }
        invoice.status = Status::Defaulted;
        Self::store(&env, &invoice);
        Ok(())
    }

    /// Read an invoice.
    pub fn get(env: Env, id: u64) -> Result<Invoice, Error> {
        Self::load(&env, id)
    }

    /// Read all invoice ids of an owner.
    pub fn owned_by(env: Env, issuer: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::Owned(issuer))
            .unwrap_or(Vec::new(&env))
    }

    // --- internal helpers ---

    fn load(env: &Env, id: u64) -> Result<Invoice, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Invoice(id))
            .ok_or(Error::InvoiceNotFound)
    }

    fn store(env: &Env, invoice: &Invoice) {
        env.storage()
            .persistent()
            .set(&DataKey::Invoice(invoice.id), invoice);
    }

    fn require_pool(env: &Env) -> Result<(), Error> {
        let pool: Address = env
            .storage()
            .instance()
            .get(&DataKey::Pool)
            .ok_or(Error::PoolNotSet)?;
        pool.require_auth();
        Ok(())
    }
}

mod test;
