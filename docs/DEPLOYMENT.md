# AnchorFlow — Testnet Deployment

**Author: Can Sarıhan** · Network: **Stellar Testnet**

AnchorFlow'un invoice-financing çekirdeği Stellar Testnet'e deploy edildi ve
**tam akış uçtan uca canlı zincirde doğrulandı.**

## Canlı kontratlar

| Kontrat | Contract ID | Explorer |
|---------|-------------|----------|
| InvoiceToken | `CDVXKOEZ7ZVXUUKEGUAF4GTS6WZOT3LRTR7PNHSVTAS42DEJ2IHDO7S5` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDVXKOEZ7ZVXUUKEGUAF4GTS6WZOT3LRTR7PNHSVTAS42DEJ2IHDO7S5) |
| LendingPool | `CDFEEMA73R5H7IWQOOLUN4GM3FTE3B7I55CDNT7QI2EBRXOTQA7ILT3E` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDFEEMA73R5H7IWQOOLUN4GM3FTE3B7I55CDNT7QI2EBRXOTQA7ILT3E) |
| USDC (SAC) | `CAW4MGEAUUFXCMU4TBBBKKNRFAOIELDIROL6ZJNOM6JDBECAOSUE2354` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAW4MGEAUUFXCMU4TBBBKKNRFAOIELDIROL6ZJNOM6JDBECAOSUE2354) |

Parametreler: avans oranı **%85**, financing fee **%2**.

## Canlı doğrulanan akış (1.000 USDC fatura)

| Adım | İşlem | On-chain sonuç |
|------|-------|----------------|
| 1 | LP havuza yatırır | likidite **10.000 USDC** |
| 2 | Freelancer fatura keser | InvoiceToken #1, status `Pending` |
| 3 | Müşteri kabul eder | status `Accepted` |
| 4 | Freelancer avans çeker | havuz→freelancer **850 USDC** transfer, status `Financed` |
| 5 | Müşteri öder | payer→havuz **1.000**, havuz→freelancer **130**; kredi atomik kapanır |
| 6 | Son durum | fatura `Paid`, kredi `Repaid` |

**Final bakiyeler (zincirden okundu):**
- Freelancer: **980 USDC** (850 avans + 130 kalan)
- Müşteri: **0 USDC** (1.000 ödedi)
- Havuz: **10.020 USDC** (10.000 + 20 fee = LP yield), borrowed 0

Rakamlar kontrat birim testleri, backend sim ve canlı zincirde **birebir aynı**.

## Yeniden deploy

```bash
# Kimlik (friendbot ile fonla)
stellar keys generate anchorflow --network testnet --fund

# Kontratları derle + deploy
cd contracts && stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/invoice_token.wasm --source anchorflow --network testnet
stellar contract deploy --wasm target/wasm32v1-none/release/lending_pool.wasm  --source anchorflow --network testnet

# USDC test varlığı (SAC)
stellar contract asset deploy --asset USDC:<ADMIN> --source anchorflow --network testnet
```

## Operasyonel notlar (deneyimden)

- **State değiştiren invoke'larda `--send=yes` kullanın.** Cross-contract +
  `require_auth` içeren çağrılarda CLI'nin varsayılan simülasyon davranışı
  yanıltıcı olabiliyor; `--send=yes` ile gerçek auth zarfları kurulup gönderiliyor.
- **USDC issuer'ı kendi varlığını SAC ile tutamaz** ("operation invalid on
  issuer"). LP / payer / freelancer için issuer'dan **ayrı** hesaplar kullanın ve
  her birine `change-trust` ile trustline kurun.
- Bir işlem `transaction submission timeout` verirse genelde geçicidir; tekrar
  gönderim çözer. Aynı şekilde borrow'dan hemen sonra repay `LoanNotFound`
  verirse RPC'nin yeni entry'yi görmesini bekleyip tekrar deneyin.

## Backend'i canlı moda alma

`.env` doldurun (bkz. `.env.example`): `SIGNER_SECRET`, `INVOICE_CONTRACT_ID`,
`LENDING_POOL_ID`, `ASSET_CONTRACT`. Backend otomatik `live` moduna geçer ve
`SorobanLedger` üzerinden bu kontratları çağırır.
