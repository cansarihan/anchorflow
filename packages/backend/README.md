# AnchorFlow — Backend

Invoice, path-payment and Soroban orchestration service. **Author: Can Sarıhan.**

## Architecture

- **Ledger adapter** (`src/ledger/`): `SimLedger` (offline, mirrors the contract
  math) ↔ `SorobanLedger` (live Stellar/Soroban). If contract addresses + the
  signing key are not provided, it automatically falls back to **sim** mode —
  `npm run dev` works instantly.
- **Services** (`src/services/`): invoice lifecycle + financing.
- **Anchor** (`src/anchor/`): SEP-24 off-ramp simulator.
- **Store** (`src/store.ts`): in-memory repo (interface ready for a PostgreSQL migration).

## Running

```bash
npm install
npm run dev            # sim mode, http://localhost:3001
npm run typecheck      # type checking
```

For live mode, fill in `SIGNER_SECRET`, `INVOICE_CONTRACT_ID`,
`LENDING_POOL_ID`, `ASSET_CONTRACT` in `.env` (see the root `.env.example`).

## End-to-end demo

```bash
PORT=3055 npm run dev &        # in a separate terminal
./../../scripts/smoke_backend.sh
```

## API

| Method | Path | Description |
|--------|-----|----------|
| GET  | `/health` | Health + ledger mode |
| POST | `/invoices` | Create invoice (+ on-chain mint) |
| GET  | `/invoices/:id` | Get invoice |
| POST | `/invoices/:id/accept` | Customer acceptance |
| POST | `/invoices/:id/finance` | Draw advance |
| GET  | `/pay/:id` | Customer payment details |
| POST | `/pay/:id/quote` | Path-payment quote (multi-currency) |
| POST | `/pay/:id/settle` | Payment + atomic loan close |
| GET  | `/pool/stats` | Pool statistics |
| POST | `/pool/deposit` | LP deposits liquidity |
| POST | `/anchor/transactions` | Start SEP-24 off-ramp |
