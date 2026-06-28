#![no_std]
//! AnchorFlow — PayrollStream
//!
//! Uzak ekipler için programlanabilir, saniye-bazlı (ledger-bazlı) maaş akışı.
//! İşveren bir akış oluşturup toplam tutarı kontrata kilitler; çalışan zamanla
//! lineer olarak hak eder (vest) ve istediği an hak edilen kısmı çekebilir.
//! İşveren akışı iptal ederse hak edilen kısım çalışana, kalan işverene döner.
//!
//! Stellar'ın sub-cent ücreti + 5 sn finality'si, bu tür mikro-akışları
//! ekonomik kılan tek modeldir.
//!
//! Author: Can Sarıhan

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum StreamStatus {
    Active = 0,
    Cancelled = 1,
    Completed = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct Stream {
    pub id: u64,
    pub employer: Address,
    pub employee: Address,
    pub asset: Address,
    pub total: i128,
    pub withdrawn: i128,
    pub start_ledger: u32,
    pub end_ledger: u32,
    pub status: StreamStatus,
}

#[contracttype]
pub enum DataKey {
    Counter,
    Stream(u64),
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    StreamNotFound = 1,
    InvalidRange = 2,
    InvalidAmount = 3,
    NotActive = 4,
    NothingToWithdraw = 5,
}

#[contract]
pub struct PayrollStream;

#[contractimpl]
impl PayrollStream {
    /// Yeni bir maaş akışı oluştur. İşveren toplam tutarı kontrata kilitler.
    pub fn create_stream(
        env: Env,
        employer: Address,
        employee: Address,
        asset: Address,
        total: i128,
        start_ledger: u32,
        end_ledger: u32,
    ) -> Result<u64, Error> {
        employer.require_auth();
        if total <= 0 {
            return Err(Error::InvalidAmount);
        }
        if end_ledger <= start_ledger {
            return Err(Error::InvalidRange);
        }

        // Toplam tutarı kontrata aktar (escrow).
        token::Client::new(&env, &asset).transfer(
            &employer,
            &env.current_contract_address(),
            &total,
        );

        let id = env
            .storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0u64)
            + 1;

        let stream = Stream {
            id,
            employer,
            employee,
            asset,
            total,
            withdrawn: 0,
            start_ledger,
            end_ledger,
            status: StreamStatus::Active,
        };
        env.storage().persistent().set(&DataKey::Stream(id), &stream);
        env.storage().instance().set(&DataKey::Counter, &id);
        Ok(id)
    }

    /// Şu ana kadar hak edilen (vest olmuş) toplam tutar.
    pub fn vested(env: Env, id: u64) -> Result<i128, Error> {
        let s = Self::load(&env, id)?;
        Ok(Self::vested_amount(&env, &s))
    }

    /// Hak edilmiş ama henüz çekilmemiş tutar.
    pub fn withdrawable(env: Env, id: u64) -> Result<i128, Error> {
        let s = Self::load(&env, id)?;
        Ok(Self::vested_amount(&env, &s) - s.withdrawn)
    }

    /// Çalışan hak edilen kısmı çeker.
    pub fn withdraw(env: Env, id: u64) -> Result<i128, Error> {
        let mut s = Self::load(&env, id)?;
        if s.status != StreamStatus::Active {
            return Err(Error::NotActive);
        }
        s.employee.require_auth();

        let amount = Self::vested_amount(&env, &s) - s.withdrawn;
        if amount <= 0 {
            return Err(Error::NothingToWithdraw);
        }

        s.withdrawn += amount;
        if s.withdrawn >= s.total {
            s.status = StreamStatus::Completed;
        }
        env.storage().persistent().set(&DataKey::Stream(id), &s);

        token::Client::new(&env, &s.asset).transfer(
            &env.current_contract_address(),
            &s.employee,
            &amount,
        );
        Ok(amount)
    }

    /// İşveren akışı iptal eder: hak edilen çalışana, kalan işverene döner.
    pub fn cancel(env: Env, id: u64) -> Result<(), Error> {
        let mut s = Self::load(&env, id)?;
        if s.status != StreamStatus::Active {
            return Err(Error::NotActive);
        }
        s.employer.require_auth();

        let vested = Self::vested_amount(&env, &s);
        let to_employee = vested - s.withdrawn;
        let to_employer = s.total - vested;

        s.withdrawn = vested;
        s.status = StreamStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Stream(id), &s);

        let tok = token::Client::new(&env, &s.asset);
        let contract = env.current_contract_address();
        if to_employee > 0 {
            tok.transfer(&contract, &s.employee, &to_employee);
        }
        if to_employer > 0 {
            tok.transfer(&contract, &s.employer, &to_employer);
        }
        Ok(())
    }

    pub fn get_stream(env: Env, id: u64) -> Result<Stream, Error> {
        Self::load(&env, id)
    }

    // --- iç yardımcılar ---

    fn load(env: &Env, id: u64) -> Result<Stream, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Stream(id))
            .ok_or(Error::StreamNotFound)
    }

    /// Lineer vesting: ledger ilerledikçe orantılı hak ediş.
    fn vested_amount(env: &Env, s: &Stream) -> i128 {
        let now = env.ledger().sequence();
        if now <= s.start_ledger {
            0
        } else if now >= s.end_ledger {
            s.total
        } else {
            let elapsed = (now - s.start_ledger) as i128;
            let span = (s.end_ledger - s.start_ledger) as i128;
            s.total * elapsed / span
        }
    }
}

mod test;
