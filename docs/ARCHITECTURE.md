# AnchorFlow — Architecture & Project Plan

**Author:** Can Sarıhan
**Track:** Stellar Startup Track
**Document:** MVP Architecture and Roadmap
**Version:** 0.1 — MVP Core: *Invoice → Financing* Full Flow

---

## 1. Vision (One Sentence)

> AnchorFlow is a Stellar-native financial operating layer that turns the verifiable income (invoices) of the cross-border independent workforce into on-chain credit.

AnchorFlow is not a wallet; it's **income infrastructure.** A freelancer,
independent team, or small digital business gets paid, converts currency, and
**draws an instant advance against an invoice that hasn't been collected yet.**

---

## 2. MVP Scope

The pitch describes four capabilities (cross-border payment, anchor on/off-ramp,
invoice financing, payroll streaming). **In the MVP, only one integrated flow runs
end to end:**

```
Invoice link  →  multi-currency payment via path payment  →  invoice tokenized on Soroban
                       →  instant advance from the lending pool  →  smart contract auto-closes when the client pays
```

### In scope (MVP)
- ✅ Invoice creation + shareable payment link
- ✅ Multi-currency settlement via Stellar **path payments** (FX over the DEX)
- ✅ Soroban **Invoice Token** contract (each invoice = one RWA token)
- ✅ Soroban **Lending Pool** contract (single pool, single asset — USDC testnet)
- ✅ Draw advance → client payment → automatic repayment (deterministic settlement)
- ✅ LP (liquidity provider) deposit/withdraw and yield display

### Out of scope (later milestones)
- ❌ Real mainnet anchor (shown with a testnet sim)
- ❌ Payroll streaming (reserved in the architecture, not coded)
- ❌ Multi-corridor anchor routing engine
- ❌ Oracle-fed FX risk model (represented by a simple fixed rate)
- ❌ Advanced default/liquidation mechanics (simple rule in the MVP)

---

## 3. System Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js)                         │
│   Freelancer Panel  │  Client Pay Page  │  LP / Pool Dashboard       │
│        Wallet connection via Freighter / Stellar Wallets Kit        │
└───────────────┬─────────────────────────────────┬───────────────────┘
                │ REST / RPC                       │ Wallet signing (client-side)
                ▼                                  ▼
┌─────────────────────────────────┐   ┌───────────────────────────────┐
│      BACKEND API (Node/TS)       │   │   STELLAR / SOROBAN NETWORK    │
│  • Invoice service               │   │                               │
│  • Payment link service          │   │  ┌─────────────────────────┐  │
│  • Path-payment builder          │──▶│  │  Stellar Core + DEX     │  │
│  • Soroban tx orchestration      │   │  │  (path payments, FX)    │  │
│  • Anchor (SEP-24) simulator     │   │  └─────────────────────────┘  │
│  • Indexer / event listener      │   │  ┌─────────────────────────┐  │
└───────────────┬─────────────────┘   │  │  Soroban Contracts:     │  │
                │                       │  │   - InvoiceToken        │  │
                ▼                       │  │   - LendingPool         │  │
┌─────────────────────────────────┐   │  └─────────────────────────┘  │
│        DB (Postgres)             │   └───────────────────────────────┘
│  off-chain metadata, link state, │
│  invoice docs, user profiles     │
└─────────────────────────────────┘
```

**Design principle:** Money and credit logic live **on chain** (Soroban), while
user-friendly metadata and link management live **off chain** (DB). Anything that
requires trust is in the contract; UX convenience is in the backend.

---

## 4. Core Flow — Step by Step

### Phase A — Invoice creation and payment
1. The freelancer creates an invoice in the panel: amount (e.g. 1000 USDC), client, due date (e.g. 60 days), accepted payment currencies.
2. The backend generates a shareable **payment link** (`/pay/:invoiceId`).
3. The client opens the link and pays in their own currency/stablecoin.
4. The backend builds a **path payment**: client's asset → Stellar DEX → the freelancer's chosen asset (~5s, sub-cent). FX is resolved over the DEX as a first-class operation.

### Phase B — Tokenize the invoice (RWA)
5. When the client "accepts" the invoice (in the MVP, represented by a payment-intent/approval signature), the backend calls `InvoiceToken.mint()`.
6. Each invoice is minted as a **unique token** owned by the freelancer. Token metadata: amount, due date, client, status (`Pending / Financed / Paid / Defaulted`).

### Phase C — Draw advance (financing)
7. The freelancer calls `LendingPool.borrow(invoiceTokenId)`.
8. The pool locks the invoice as collateral and instantly pays the freelancer **80–90% of the invoice value.**
9. The pool's liquidity comes from LPs worldwide; the interest/discount is their yield.

### Phase D — Automatic settlement
10. At maturity, the client pays the invoice (via the payment link).
11. The payment is routed to the pool; the smart contract **closes the loan automatically**, transfers the remainder to the freelancer, and distributes interest to the LPs.
12. If the client doesn't pay: the token becomes `Defaulted`, represented in the MVP by a simple rule (collateral/risk fund); real liquidation is Milestone 3.

---

## 5. Soroban Contract Design

### 5.1 `InvoiceToken` Contract
The RWA contract that tokenizes the invoice on chain.

**Storage:**
```
Invoice {
  id: u64,
  issuer: Address,        // freelancer
  payer: Address,         // client (optional/known)
  amount: i128,           // invoice amount (stroops/7-decimal)
  asset: Address,         // settlement asset (USDC)
  due_ledger: u32,        // due date (ledger sequence)
  status: Status,         // Pending | Accepted | Financed | Paid | Defaulted
  doc_hash: BytesN<32>,   // hash of the off-chain invoice document (authenticity)
}
```

**Functions:**
- `mint(issuer, amount, asset, due, doc_hash) -> id`
- `accept(id)` — client acceptance signature (financing precondition)
- `mark_financed(id, pool)` — only the LendingPool can call
- `mark_paid(id)` / `mark_defaulted(id)`
- `get(id) -> Invoice`

> **Authenticity (the core trust problem):** `doc_hash` binds the off-chain invoice document to the chain. In the MVP, the "accept" step represents client approval. In a later milestone: e-signature, client attestation, oracle verification.

### 5.2 `LendingPool` Contract
The pool that lends advances against invoice collateral and distributes LP yield.

**Storage:**
```
Pool {
  asset: Address,             // USDC
  total_liquidity: i128,
  total_borrowed: i128,
  advance_ratio: u32,         // e.g. 8500 = 85%
  fee_bps: u32,               // financing discount/interest
  shares: Map<Address,i128>,  // LP shares
}
Loan {
  invoice_id: u64,
  borrower: Address,
  principal: i128,
  status: LoanStatus,
}
```

**Functions:**
- `deposit(lp, amount)` / `withdraw(lp, shares)` — LP liquidity
- `borrow(invoice_id)` — lock the invoice, pay the advance, call `mark_financed`
- `repay(invoice_id, amount)` — client payment; close the loan, remainder to the issuer, fee to the LPs
- `handle_default(invoice_id)` — simple MVP rule
- `pool_stats() -> (liquidity, borrowed, utilization, apy)`

**Deterministic settlement (critical):** When `repay` is called, the entire
distribution happens atomically within a single transaction — the off-chain
receivable closes **provably** against the on-chain credit. This is exactly where
the "core technical and trust problem" from the pitch gets solved.

---

## 6. Module / Repo Structure

```
anchorflow/
├── contracts/                  # Soroban (Rust)
│   ├── invoice-token/
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   ├── lending-pool/
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   └── Cargo.toml              # workspace
├── packages/
│   ├── backend/                # Node + TypeScript
│   │   ├── src/
│   │   │   ├── invoice/        # invoice service
│   │   │   ├── payments/       # path-payment builder
│   │   │   ├── soroban/        # contract call orchestration
│   │   │   ├── anchor/         # SEP-24 simulator
│   │   │   └── indexer/        # event listener
│   │   └── package.json
│   ├── frontend/               # Next.js
│   │   ├── app/
│   │   │   ├── invoice/        # freelancer panel
│   │   │   ├── pay/[id]/       # client payment page
│   │   │   └── pool/           # LP dashboard
│   │   └── package.json
│   └── shared/                 # shared types, ABI, asset config
├── docs/
│   └── ARCHITECTURE.md
└── README.md
```

---

## 7. Technology Stack

| Layer | Technology | Why |
|--------|-----------|-------|
| Smart contracts | Soroban (Rust) | Secure RWA + lending logic |
| Payments / FX | Stellar SDK (JS) | Path payments, native DEX, SEP-10 |
| Anchor | SEP-24 / SEP-31 (testnet sim) | Local fiat on/off-ramp bridge |
| Backend | Node.js + TypeScript | Tx orchestration, indexer |
| Database | PostgreSQL | Off-chain metadata, link state |
| Frontend | Next.js + Stellar Wallets Kit | Freighter wallet, 3 panels |
| Network | Testnet → Futurenet → Mainnet | Phased rollout |

---

## 8. Data Model (Off-chain, Postgres)

```
users         (id, stellar_address, role, created_at)
invoices      (id, onchain_id, issuer_id, payer_email, amount,
               asset, due_date, status, doc_hash, pay_link, created_at)
payments      (id, invoice_id, path_payment_tx, source_asset,
               dest_asset, amount, status, ledger)
loans         (id, invoice_id, onchain_loan_id, principal,
               advance_ratio, status)
lp_positions  (id, user_id, shares, deposited, created_at)
```

---

## 9. Trust & Security Notes

| Risk | MVP approach | Next milestone |
|------|---------------|-------------------|
| Invoice forgery | `doc_hash` + client `accept` signature | E-signature, client attestation, oracle |
| Double financing | Token `status` is locked in the contract | — |
| Default | Simple risk-fund rule | Full liquidation + credit score |
| FX risk | Fixed/representative rate | Oracle-fed dynamic rate |
| LP fund safety | Atomic settlement, audited contract pattern | Independent audit |
| Reentrancy / authorization | Soroban auth + checks-effects pattern | Formal review |

---

## 10. Milestone Roadmap

| # | Milestone | Output |
|---|-----------|-------|
| **1** | **MVP (hackathon)** | Invoice link → path-payment → InvoiceToken → single LendingPool → automatic settlement. End-to-end working demo on testnet. |
| 2 | Anchor off-ramp | SEP-24 testnet anchor integration, local cash-out sim. |
| 3 | Lending hardening | Default handling, partial repayment, oracle-fed FX risk. |
| 4 | Payroll streaming | Per-second payroll + milestone escrow via Soroban. |
| 5 | Mainnet pilot | Multi-corridor, real anchors, first LPs, first real user. |

---

## 11. Demo Scenario (For Judges)

> "A freelancer in Lagos issues a 1000 USDC invoice to their client in Berlin. The client pays with EURC — a path payment converts it to USDC in ~5 seconds. Instead of waiting 60 days, the freelancer tokenizes the invoice and draws **850 USDC instantly** from the pool. 60 days later, when the client pays, the smart contract closes the loan automatically, the freelancer gets the remainder, and an LP on the other side of the world earns real cash-flow-backed yield. Without touching a single bank or a single SWIFT message."

This 90-second demo proves the entire narrative (cross-border + RWA + financing +
global LP) in a single flow.

---

*All design, code, and documentation belong to Can Sarıhan.*
