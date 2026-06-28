# AnchorFlow — Stellar Startup Track Submission

**Programmable cross-border treasury & invoice-financing rails for the global
independent workforce.**

By **Can Sarıhan** · Built on **Stellar & Soroban** · **Live on Testnet**

---

## One line

AnchorFlow is the Stellar-native financial operating layer that turns the
verifiable income (invoices) of the borderless independent workforce into
on-chain credit. It's not a wallet — it's **income infrastructure.**

---

## The problem

The independent economy now means hundreds of millions of people working across
borders; yet the money rails underneath them are still designed for banks and
3-day wire transfers.

An independent worker invoicing a client in another country typically:
- loses **5–10%** to FX spread and remittance fees,
- waits **3–7 days** to get paid,
- and gets paid **30–60 days late** because the client dictates the invoice terms.

Worst of all: that worker is holding a real, contractual **receivable** —
verifiable income — yet **cannot borrow a single cent** against it. Traditional
credit systems can neither see nor price cross-border, freelance cash flow.
**The capital exists; it just never reaches the person who earned it.**

---

## The product — one payment link, a full treasury stack

1. **Get paid in anything, receive whatever you want.** The client pays in their
   own currency/stablecoin. Using Stellar **path payments**, the transaction is
   automatically routed through the built-in DEX and settles into the asset the
   worker chose in **~5 seconds, for less than a cent.** No correspondent banks,
   no SWIFT.

2. **Convert to local cash via anchors.** With Stellar **anchors** and the **SEP**
   standards, the worker off-ramps directly to their local bank or mobile money —
   usable even in regions banks ignore.

3. **Tokenize the invoice, unlock the income.** Every accepted invoice is minted
   as a tokenized RWA on **Soroban**. Against that invoice, the worker draws an
   **instant advance** from a permissionless credit pool — **80–90%** of the
   invoice today instead of in 60 days. When the client pays, the smart contract
   **closes the loan automatically.** Liquidity providers around the world earn
   real **cash-flow-backed yield** instead of speculative DeFi.

4. **Programmable payroll streaming.** For remote teams, Soroban contracts provide
   ledger-based payroll streaming (linear vesting); a contributor withdraws what
   they've earned at any moment, and if the employer cancels, funds split fairly.
   *(The PayrollStream contract is live on testnet.)*

---

## Why Stellar — and why only Stellar does this cleanly

This product cannot be built elegantly on a generic chain. Stellar provides four
primitives in one place:

| Primitive | Why it's critical |
|-----------|--------------|
| **Anchors** | Regulated fiat on/off-ramps — a bridge to local economies. *No one else has this; it's the part that makes this "real money."* |
| **Path payments + native DEX** | Multi-currency FX as a **first-class** operation, not a third-party API. |
| **Sub-cent fees + 5s finality** | **The only model where** micro-payroll streaming and small-invoice financing are economical. |
| **Soroban** | Rust contracts that securely tokenize the invoice and run the lending logic. |

---

## Why it's technically hard (and worth doing)

The difficulty is combining three hard systems into a single trustworthy flow:
- a **multi-anchor routing engine** that picks the best fiat ramp per corridor,
- a **path-payment FX optimizer** that minimizes slippage on the DEX,
- and a **Soroban RWA + lending protocol** in which invoice authenticity, default,
  partial repayment, and oracle-fed FX risk must be **provably safe** with other
  people's money.

Making off-chain receivables settle **deterministically** against on-chain credit
— that's the core technical and trust problem. Solving it is what turns this from
a payment app into **financial infrastructure.**

---

## Traction — this isn't a slide, it works

> **The entire invoice-financing core is live on Stellar Testnet and verified
> end-to-end on chain.**

A live flow run with 4 real accounts (freelancer, client, LP, admin):

| Step | On-chain result |
|------|----------------|
| LP deposits into the pool | 10,000 USDC liquidity |
| Freelancer issues a 1,000 USDC invoice → client accepts | InvoiceToken, `Accepted` |
| Freelancer draws an advance | pool→freelancer **850 USDC**, `Financed` |
| Client pays | payer→pool **1,000**, pool→freelancer **130**; loan closes atomically |
| Final | freelancer **980**, pool **10,020** (20 = LP yield), invoice `Paid` |

The same math holds exactly across all three layers: contract unit tests
(**10/10**), backend simulation, and **live testnet.** Contract IDs and explorer
links: [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Target users

1. **Cross-border freelancers and content creators** — who want fast/cheap payments + receivable financing.
2. **Distributed startups and DAOs** — running global, multi-currency payroll.
3. **Small digital exporters/agencies** — that need working capital.
4. **Liquidity providers** — seeking yield based on real economic activity, not token emissions.

---

## Market & why now

The independent workforce is one of the fastest-growing labor segments on earth — hundreds of millions of cross-border freelancers, contractors, and micro-businesses, expanding every year as remote work becomes the default. The money rails serving them, however, are decades old:

- **Cross-border payments** move well over **$150T** in flows annually, and global **remittances** alone are **~$850B/year** at an average cost of **~6%** (World Bank) — a multi-tens-of-billions tax paid largely by the people who can least afford it.
- **Invoice financing / factoring** is already a **~$3.5T/year** global market — yet it is gatekept by banks and almost entirely closed to cross-border, self-employed earners whose receivables banks cannot see or price.
- **Stablecoins** now settle **trillions of dollars** per year, increasingly as real payment rails rather than trading collateral.

**Why now:**

- **Stablecoins crossed from speculation to settlement.** USDC is native on Stellar, and regulatory clarity (MiCA, emerging US stablecoin frameworks) is turning them into compliant money.
- **RWA tokenization is the dominant 2025–2026 on-chain narrative**, and Stellar is investing heavily in it — invoice receivables are among the most natural real-world assets to bring on-chain.
- **Stellar's anchor network and SEP standards have matured** enough to make local fiat on/off-ramps real in exactly the regions traditional finance ignores.
- **Borderless work is now normal**, but its financial infrastructure never caught up. The gap between *verifiable global income* and *accessible global credit* has never been wider — or more addressable.

AnchorFlow sits at the intersection of three accelerating curves: **borderless work, stablecoin settlement, and RWA credit.**

---

## Business model

- Invoice-financing discount spread (fee_bps),
- a protocol share of LP yield,
- transaction/settlement fees.

Clean, demonstrable revenue → a natural path to **"revenue milestones."**

---

## Roadmap (milestone-based)

| # | Milestone | Status |
|---|-----------|-------|
| 1 | MVP: invoice → financing (Testnet) | ✅ **Done — live** |
| 2 | Anchor off-ramp (SEP-24) integration | ⏳ |
| 3 | Lending hardening: default, partial repayment, oracle-fed FX | ⏳ |
| 4 | Programmable payroll streaming | ✅ **Contract live** |
| 5 | Mainnet pilot: multi-corridor, real anchors, first LPs & users | ⏳ |

---

## Architecture (overview)

```
Frontend (Next.js)  ──►  Backend (Node/TS)  ──►  Stellar / Soroban
 3 panels                ledger adapter            InvoiceToken (RWA)
 freelancer/pay/pool     sim ↔ live                LendingPool (advance + yield)
                         path-payment builder      DEX (path payments / FX)
                         SEP-24 anchor sim
```

Detail: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Demo runbook: [`DEMO.md`](DEMO.md)

---

**AnchorFlow is not another wallet. It's income infrastructure for the borderless
workforce — and Stellar's anchors, path payments, and Soroban are the only stack
that makes this real today.**

— Can Sarıhan
