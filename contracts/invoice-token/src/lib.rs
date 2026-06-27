#![no_std]
//! AnchorFlow — InvoiceToken
//!
//! Her doğrulanmış fatura, Stellar/Soroban üzerinde benzersiz bir RWA (real-world
//! asset) token'ı olarak temsil edilir. Token'ın sahibi onu kesen bağımsız
//! çalışandır (issuer). LendingPool, bu token'ı teminat alarak avans verir.
//!
//! Güven modeli (MVP): `doc_hash` off-chain fatura belgesini zincire bağlar;
//! `accept` adımı müşteri onayını temsil eder ve financing'in ön koşuludur.
//!
//! Author: Can Sarıhan

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, Vec,
};

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status {
    /// Basıldı, henüz müşteri kabulü yok.
    Pending = 0,
    /// Müşteri faturayı kabul etti — financing'e uygun.
    Accepted = 1,
    /// LendingPool teminat aldı, avans ödendi.
    Financed = 2,
    /// Müşteri ödedi, kredi kapandı.
    Paid = 3,
    /// Vade geçti, ödenmedi.
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
    /// Kontrat yöneticisi (deploy eden).
    Admin,
    /// LendingPool adresi — yalnızca o `mark_financed`/`mark_paid` çağırabilir.
    Pool,
    /// Artan fatura sayacı.
    Counter,
    /// id -> Invoice
    Invoice(u64),
    /// issuer -> Vec<u64> (sahibe ait fatura id'leri)
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
    /// Kontratı başlat. Admin, pool adresini sonradan atayabilir.
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Counter, &0u64);
        Ok(())
    }

    /// LendingPool kontrat adresini ata (yalnızca admin).
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

    /// Yeni bir fatura token'ı bas. Çağıran issuer olmalı.
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

    /// Müşteri faturayı kabul eder — financing ön koşulu.
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

    /// Faturayı "financed" olarak işaretle — yalnızca LendingPool çağırabilir.
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

    /// Faturayı "paid" olarak işaretle — yalnızca LendingPool çağırabilir.
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

    /// Faturayı "defaulted" olarak işaretle — yalnızca LendingPool çağırabilir.
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

    /// Bir faturayı oku.
    pub fn get(env: Env, id: u64) -> Result<Invoice, Error> {
        Self::load(&env, id)
    }

    /// Bir sahibin tüm fatura id'lerini oku.
    pub fn owned_by(env: Env, issuer: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::Owned(issuer))
            .unwrap_or(Vec::new(&env))
    }

    // --- iç yardımcılar ---

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
