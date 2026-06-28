# AnchorFlow — Testnet Deployment

**Author: Can Sarıhan** · Network: **Stellar Testnet**

AnchorFlow's invoice-financing core has been deployed to Stellar Testnet and the
**full flow has been verified end-to-end live on chain.**

## Live contracts

| Contract | Contract ID | Explorer |
|---------|-------------|----------|
| InvoiceToken | `CDVXKOEZ7ZVXUUKEGUAF4GTS6WZOT3LRTR7PNHSVTAS42DEJ2IHDO7S5` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDVXKOEZ7ZVXUUKEGUAF4GTS6WZOT3LRTR7PNHSVTAS42DEJ2IHDO7S5) |
| LendingPool | `CDFEEMA73R5H7IWQOOLUN4GM3FTE3B7I55CDNT7QI2EBRXOTQA7ILT3E` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDFEEMA73R5H7IWQOOLUN4GM3FTE3B7I55CDNT7QI2EBRXOTQA7ILT3E) |
| PayrollStream | `CBUTHZNJDLAMQT55GEX2ZCZQTWMQCAM7CIWRFFULZNJBA6ULJ5V7MZOM` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CBUTHZNJDLAMQT55GEX2ZCZQTWMQCAM7CIWRFFULZNJBA6ULJ5V7MZOM) |
| USDC (SAC) | `CAW4MGEAUUFXCMU4TBBBKKNRFAOIELDIROL6ZJNOM6JDBECAOSUE2354` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAW4MGEAUUFXCMU4TBBBKKNRFAOIELDIROL6ZJNOM6JDBECAOSUE2354) |

Parameters: advance ratio **85%**, financing fee **2%**.

## Live-verified flow (1,000 USDC invoice)

| Step | Action | On-chain result |
|------|-------|----------------|
| 1 | LP deposits into the pool | liquidity **10,000 USDC** |
| 2 | Freelancer issues an invoice | InvoiceToken #1, status `Pending` |
| 3 | Client accepts | status `Accepted` |
| 4 | Freelancer draws an advance | pool→freelancer **850 USDC** transfer, status `Financed` |
| 5 | Client pays | payer→pool **1,000**, pool→freelancer **130**; loan closes atomically |
| 6 | Final state | invoice `Paid`, loan `Repaid` |

**Final balances (read from chain):**
- Freelancer: **980 USDC** (850 advance + 130 remainder)
- Client: **0 USDC** (paid 1,000)
- Pool: **10,020 USDC** (10,000 + 20 fee = LP yield), borrowed 0

The numbers are **identical** across contract unit tests, backend sim, and live chain.

## PayrollStream — live-verified flow (10 USDC, ~100s stream)

| Step | On-chain result |
|------|----------------|
| Employer creates a stream | 10 USDC escrowed into the contract (transfer event) |
| Ledgers advance | linear vesting: `vested` grows over time |
| When the period ends, `vested` | full **10 USDC** |
| Employee calls `withdraw` | contract→employee **10 USDC** transfer; stream `Completed` |

If the employer `cancel`s early, the vested amount goes to the employee and the
remainder returns to the employer (also proven by unit tests).

## Redeploy

```bash
# Identity (fund with friendbot)
stellar keys generate anchorflow --network testnet --fund

# Build + deploy contracts
cd contracts && stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/invoice_token.wasm --source anchorflow --network testnet
stellar contract deploy --wasm target/wasm32v1-none/release/lending_pool.wasm  --source anchorflow --network testnet

# USDC test asset (SAC)
stellar contract asset deploy --asset USDC:<ADMIN> --source anchorflow --network testnet
```

## Operational notes (from experience)

- **Use `--send=yes` on state-changing invokes.** For cross-contract calls
  involving `require_auth`, the CLI's default simulation behavior can be
  misleading; with `--send=yes` the real auth envelopes are built and submitted.
- **A USDC issuer cannot hold its own asset via a SAC** ("operation invalid on
  issuer"). Use **separate** accounts from the issuer for LP / payer / freelancer
  and set up a trustline for each with `change-trust`.
- If a transaction returns `transaction submission timeout`, it's usually
  transient; resubmitting resolves it. Likewise, if `repay` returns `LoanNotFound`
  right after `borrow`, wait for the RPC to see the new entry and try again.

## Switching the backend to live mode

Fill in `.env` (see `.env.example`): `SIGNER_SECRET`, `INVOICE_CONTRACT_ID`,
`LENDING_POOL_ID`, `ASSET_CONTRACT`. The backend automatically switches to `live`
mode and calls these contracts via `SorobanLedger`.

**Signer choice:** The backend signs all transactions with a single key, so the
signer must be an account that is NOT the USDC issuer (an issuer cannot hold its
own asset via a SAC). For the demo, issuer=payer=lp=signer can be used.

### Live backend flow — verified ✅

The entire flow was driven over the HTTP API in `live` mode against Stellar
testnet and verified on chain (100 USDC invoice):

| HTTP call | On-chain result |
|--------------|----------------|
| `POST /pool/deposit` | real txHash, pool liquidity increased |
| `POST /invoices` | InvoiceToken on-chain mint (returns onchainId) |
| `POST /invoices/:id/accept` | status `Accepted` |
| `POST /invoices/:id/finance` | pool→freelancer 85 USDC, loan `Active` |
| `POST /pay/:id/settle` | atomic repay; invoice `Paid`, loan `Repaid`, +2 fee to the pool |

**Notes (from experience):**
- `@stellar/stellar-sdk` **≥16** is required — testnet now returns protocol 23
  (`TransactionMeta v4`); the old SDK crashes with `"Bad union switch: 4"`.
- Due to testnet RPC confirmation latency, a transaction may rarely time out with
  `NOT_FOUND`; repeating the call resolves it (`invoke()` polls for up to 90s and
  resubmits on `TRY_AGAIN_LATER`).
