# AnchorFlow — Demo Runbook

Jüri/sunum için adım adım demo. **Author: Can Sarıhan.**

İki seçenek: **(A) 90 saniyelik UI demosu** (sim modu, her ortamda çalışır) ve
**(B) Canlı testnet demosu** (zincirde gerçek işlem).

---

## A) 90 saniyelik UI demosu (sim modu)

### Hazırlık (tek seferlik)
```bash
# Terminal 1 — backend (sim modu, kontrat adresi gerekmez)
cd packages/backend && npm install && PORT=3001 npm run dev

# Terminal 2 — frontend
cd packages/frontend && npm install && npm run dev
# http://localhost:3000
```

### Anlatı + tıklamalar
> "Lagos'taki bir freelancer, Berlin'deki müşterisine 1.000 USDC fatura kesiyor."

1. **`/invoice`** — sağ üstten bir G… adresi bağla (freelancer). Tutar `1000`,
   vade seç, **Fatura oluştur.** → Liste'de `Pending` fatura + ödeme link'i belirir.

2. **Kabul (demo)** butonu → fatura `Accepted`. *(Gerçekte müşteri ödeme
   link'inden onaylar.)*

> "60 gün beklemek yerine faturasını tokenize edip pool'dan anında avans çekiyor."

3. **Avans çek** → fatura `Financed`. (Backend `borrow` çağırır, %85 = 850 USDC.)

4. **`/pool`** — havuzu göster: kullanım %8.5'e çıktı, kredilerde 850 USDC.

> "60 gün sonra müşteri ödediğinde, akıllı sözleşme krediyi otomatik kapatıyor."

5. **`/pay/<id>`** (ödeme link'i) — müşteri **EURC** seçer, **Kur teklifi al**
   (path-payment: ~1001 EURC → 1000 USDC, DEX üzerinden FX), sonra **Öde.**
   → "Ödeme alındı — kredi otomatik kapatıldı ✓".

6. **`/pool`** tekrar — likidite **10.020**'ye çıktı: **20 USDC = LP yield.**

> "Tek bir bankaya, tek bir SWIFT mesajına dokunmadan."

---

## B) Canlı testnet demosu (zincirde gerçek)

Kontratlar zaten deploy ve doğrulanmış (bkz. `DEPLOYMENT.md`). Akışı zincirde
yeniden göstermek için:

```bash
cd contracts
INVOICE=CDVXKOEZ7ZVXUUKEGUAF4GTS6WZOT3LRTR7PNHSVTAS42DEJ2IHDO7S5
POOL=CDFEEMA73R5H7IWQOOLUN4GM3FTE3B7I55CDNT7QI2EBRXOTQA7ILT3E
ASSET=CAW4MGEAUUFXCMU4TBBBKKNRFAOIELDIROL6ZJNOM6JDBECAOSUE2354
FREELANCER=$(stellar keys address af-freelancer)
PAYER=$(stellar keys address af-payer)

# Yeni fatura bas (issuer=freelancer, payer=payer), id'yi not al
stellar contract invoke --id $INVOICE --source af-freelancer --network testnet --send=yes -- \
  mint --issuer $FREELANCER --payer $PAYER --amount 5000000000 \
  --asset $ASSET --due_ledger 6000000 --doc_hash $(printf 'bb%.0s' {1..32})

# Kabul (müşteri) — id'yi yukarıdan koy
stellar contract invoke --id $INVOICE --source af-payer --network testnet --send=yes -- accept --id <ID>

# Avans çek (freelancer)
stellar contract invoke --id $POOL --source af-freelancer --network testnet --send=yes -- borrow --invoice_id <ID>

# Müşteri öder — kredi atomik kapanır
stellar contract invoke --id $POOL --source af-payer --network testnet --send=yes -- repay --payer $PAYER --invoice_id <ID>

# Havuz durumunu göster (fee = LP yield kadar büyür)
stellar contract invoke --id $POOL --source anchorflow --network testnet -- pool_stats
```

Her işlemden sonra **stellar.expert** explorer link'i çıkar — jüriye gerçek
transfer event'lerini canlı gösterebilirsin.

---

## Konuşma noktaları (jüri soruları için)

- **"Fatura sahte olabilir mi?"** → MVP'de `doc_hash` belgeyi zincire bağlar +
  müşteri `accept` imzası financing ön koşuludur. Milestone 3: e-imza, müşteri
  attestation, oracle doğrulama.
- **"LP parası güvende mi?"** → `repay` tek transaction'da atomik: anapara serbest,
  fee LP'ye, kalan freelancer'a. Çifte-financing token `status`'ü ile kontratta
  engellenir. 10/10 test + canlı testnet ile kanıtlı.
- **"Neden Stellar?"** → Anchor + path payments + DEX + Soroban tek yığında.
  Anchor'lar bunu "gerçek para" yapan, başka zincirde olmayan parça.
- **"Gelir nereden?"** → financing iskonto spread'i + LP yield payı + işlem ücreti.
