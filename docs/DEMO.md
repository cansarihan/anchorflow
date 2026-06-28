# AnchorFlow — Demo Runbook

A step-by-step demo for judges/presentation. **Author: Can Sarıhan.**

Two options: **(A) 90-second UI demo** (sim mode, works in any environment) and
**(B) Live testnet demo** (real on-chain transactions).

---

## A) 90-second UI demo (sim mode)

### Setup (one-time)
```bash
# Terminal 1 — backend (sim mode, no contract address needed)
cd packages/backend && npm install && PORT=3001 npm run dev

# Terminal 2 — frontend
cd packages/frontend && npm install && npm run dev
# http://localhost:3000
```

### Narrative + clicks
> "A freelancer in Lagos issues a 1,000 USDC invoice to their client in Berlin."

1. **`/invoice`** — connect a G… address from the top right (freelancer). Amount
   `1000`, pick a due date, **Create invoice.** → A `Pending` invoice + payment
   link appears in the list.

2. **Accept (demo)** button → invoice `Accepted`. *(In reality, the client
   approves from the payment link.)*

> "Instead of waiting 60 days, they tokenize the invoice and draw an instant advance from the pool."

3. **Draw advance** → invoice `Financed`. (The backend calls `borrow`, 85% = 850 USDC.)

4. **`/pool`** — show the pool: utilization rose to 8.5%, 850 USDC in loans.

> "60 days later, when the client pays, the smart contract closes the loan automatically."

5. **`/pay/<id>`** (payment link) — the client picks **EURC**, **Get a quote**
   (path-payment: ~1001 EURC → 1000 USDC, FX over the DEX), then **Pay.**
   → "Payment received — loan closed automatically ✓".

6. **`/pool`** again — liquidity rose to **10,020**: **20 USDC = LP yield.**

7. **`/cashout`** — the freelancer converts their USDC to local cash: **Start
   off-ramp** (anchor SEP-24 withdraw) → **Sent to bank** → `Completed`.
   *"Anchors are the part that makes this real money, the piece that exists on no other chain."*

> "Without touching a single bank or a single SWIFT message."

**Full loop:** get paid (path-payment) → finance your invoice → convert to local
cash (anchor) → the LP earns real yield.

### Bonus: programmable payroll streaming (`/payroll`)

> "For distributed teams, payroll streams second by second without waiting for month-end."

8. **`/payroll`** — enter the employee address + amount + duration, **Create
   stream** (the amount is escrowed into the contract). The **vesting progress
   bar** fills live; the employee withdraws at any time with **Withdraw earned**.
   If the employer cancels, funds split fairly.

---

## B) Live testnet demo (real on chain)

The contracts are already deployed and verified (see `DEPLOYMENT.md`). To replay
the flow on chain:

```bash
cd contracts
INVOICE=CDVXKOEZ7ZVXUUKEGUAF4GTS6WZOT3LRTR7PNHSVTAS42DEJ2IHDO7S5
POOL=CDFEEMA73R5H7IWQOOLUN4GM3FTE3B7I55CDNT7QI2EBRXOTQA7ILT3E
ASSET=CAW4MGEAUUFXCMU4TBBBKKNRFAOIELDIROL6ZJNOM6JDBECAOSUE2354
FREELANCER=$(stellar keys address af-freelancer)
PAYER=$(stellar keys address af-payer)

# Mint a new invoice (issuer=freelancer, payer=payer), note the id
stellar contract invoke --id $INVOICE --source af-freelancer --network testnet --send=yes -- \
  mint --issuer $FREELANCER --payer $PAYER --amount 5000000000 \
  --asset $ASSET --due_ledger 6000000 --doc_hash $(printf 'bb%.0s' {1..32})

# Accept (client) — put the id from above
stellar contract invoke --id $INVOICE --source af-payer --network testnet --send=yes -- accept --id <ID>

# Draw advance (freelancer)
stellar contract invoke --id $POOL --source af-freelancer --network testnet --send=yes -- borrow --invoice_id <ID>

# Client pays — loan closes atomically
stellar contract invoke --id $POOL --source af-payer --network testnet --send=yes -- repay --payer $PAYER --invoice_id <ID>

# Show pool state (fee grows by the LP yield)
stellar contract invoke --id $POOL --source anchorflow --network testnet -- pool_stats
```

After each transaction, a **stellar.expert** explorer link is printed — you can
show the judges the real transfer events live.

---

## Talking points (for judge questions)

- **"Could the invoice be fake?"** → In the MVP, `doc_hash` binds the document to
  the chain + the client `accept` signature is a financing precondition.
  Milestone 3: e-signature, client attestation, oracle verification.
- **"Is the LP's money safe?"** → `repay` is atomic in a single transaction:
  principal released, fee to the LP, remainder to the freelancer. Double-financing
  is prevented in the contract via the token `status`. Proven by 10/10 tests + live testnet.
- **"Why Stellar?"** → Anchor + path payments + DEX + Soroban in a single stack.
  Anchors are the part that makes this "real money," the piece that exists on no other chain.
- **"Where does revenue come from?"** → Financing discount spread + a share of LP yield + transaction fees.
