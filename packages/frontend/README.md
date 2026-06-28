# AnchorFlow — Frontend

A Next.js (App Router) app with three dashboards: freelancer, customer payment, liquidity provider.
**Author: Can Sarıhan.**

## Pages

| Path | Dashboard |
|------|-----------|
| `/` | Landing |
| `/invoice` | Freelancer: create invoice, accept (demo), draw advance |
| `/pay/[id]` | Customer: rate quote + pay (atomic loan repayment) |
| `/payroll` | Payroll stream: create (escrow) + live vesting + withdraw |
| `/cashout` | Anchor off-ramp (SEP-24): cash out USDC to local money |
| `/pool` | LP: pool stats + deposit liquidity |

## Running

Run the backend separately (default `:3001`), then:

```bash
npm install
npm run dev          # http://localhost:3000
```

`/api/*` requests are forwarded to `BACKEND_URL` (default `http://localhost:3001`).
**Note:** Next.js `rewrites` are baked in at build time; export `BACKEND_URL` for a
different backend before running `npm run build`. `npm run dev` reads this variable
at startup.

## Wallet

In the MVP, the connected account is kept in `localStorage` as a manually entered
G… address (a demo that works in any environment). The production integration point
is in `app/lib/wallet.ts` → `connectFreighter()` (Freighter / Stellar Wallets Kit).
