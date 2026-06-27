# AnchorFlow — Backend

Fatura, path-payment ve Soroban orkestrasyon servisi. **Author: Can Sarıhan.**

## Mimari

- **Ledger adapter** (`src/ledger/`): `SimLedger` (ağsız, kontrat matematiğinin
  aynası) ↔ `SorobanLedger` (canlı Stellar/Soroban). Kontrat adresleri + imza
  anahtarı verilmezse otomatik **sim** moduna düşer — `npm run dev` anında çalışır.
- **Servisler** (`src/services/`): fatura yaşam döngüsü + financing.
- **Anchor** (`src/anchor/`): SEP-24 off-ramp simülatörü.
- **Store** (`src/store.ts`): in-memory repo (PostgreSQL'e geçişe hazır arayüz).

## Çalıştırma

```bash
npm install
npm run dev            # sim modu, http://localhost:3001
npm run typecheck      # tip kontrolü
```

Canlı mod için `.env`'de `SIGNER_SECRET`, `INVOICE_CONTRACT_ID`,
`LENDING_POOL_ID`, `ASSET_CONTRACT` doldurun (bkz. kök `.env.example`).

## Uçtan uca demo

```bash
PORT=3055 npm run dev &        # ayrı terminalde
./../../scripts/smoke_backend.sh
```

## API

| Method | Yol | Açıklama |
|--------|-----|----------|
| GET  | `/health` | Sağlık + ledger modu |
| POST | `/invoices` | Fatura oluştur (+ on-chain mint) |
| GET  | `/invoices/:id` | Fatura getir |
| POST | `/invoices/:id/accept` | Müşteri kabulü |
| POST | `/invoices/:id/finance` | Avans çek |
| GET  | `/pay/:id` | Müşteri ödeme detayı |
| POST | `/pay/:id/quote` | Path-payment teklifi (çok para birimli) |
| POST | `/pay/:id/settle` | Ödeme + atomik kredi kapanışı |
| GET  | `/pool/stats` | Havuz istatistikleri |
| POST | `/pool/deposit` | LP likidite yatırır |
| POST | `/anchor/transactions` | SEP-24 off-ramp başlat |
