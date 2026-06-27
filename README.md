# AnchorFlow

**Programmable cross-border treasury & invoice-financing rails for the global independent workforce.**

> AnchorFlow, sınır ötesi çalışan bağımsız iş gücünün doğrulanabilir gelirini
> (faturalarını) zincir üstü krediye dönüştüren, Stellar-native bir finansal
> işletim katmanıdır. Bir cüzdan değil — **gelir altyapısı.**

Built on Stellar & Soroban. **Author: Can Sarıhan.**

---

## Neden Stellar?

AnchorFlow'u zarif biçimde inşa edilebilir kılan dört primitive tek yerde:

- **Anchors** — düzenlenmiş fiat on/off-ramp; yerel ekonomilere köprü.
- **Path payments + native DEX** — çok para birimli FX, first-class işlem.
- **Sub-cent ücret + 5 sn finality** — küçük-fatura financing ve mikro-payroll'u ekonomik kılan tek model.
- **Soroban** — faturayı RWA olarak tokenize eden ve lending mantığını güvenle çalıştıran Rust kontratları.

## MVP — *Invoice → Financing* tam akışı

```
Invoice link → path-payment settlement → Soroban'da tokenize
            → lending pool'dan anında avans → müşteri ödeyince otomatik kapanış
```

Detaylı tasarım: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Repo yapısı

```
anchorflow/
├── contracts/            # Soroban (Rust)
│   ├── invoice-token/    # Fatura RWA token kontratı
│   └── lending-pool/     # Avans + LP yield kontratı
├── packages/
│   ├── backend/          # Node + TS: tx orkestrasyon, indexer, anchor sim
│   ├── frontend/         # Next.js: freelancer / pay / pool panelleri
│   └── shared/           # Ortak tipler, ABI, asset config
└── docs/
    └── ARCHITECTURE.md
```

## Geliştirme

Gereksinimler: Rust 1.95+, `stellar` CLI 26+, Node 22+.

```bash
# Kontrat testleri
cd contracts && cargo test

# Deploy edilebilir wasm derle
stellar contract build

# Testnet'e deploy (identity ayarlı olmalı)
./scripts/deploy_testnet.sh
```

## Test durumu

`contracts/`: **10/10 test geçiyor** — uçtan uca financing akışı dahil
(deposit → borrow → repay → otomatik settlement → LP yield).

## Yol haritası

| # | Milestone | Durum |
|---|-----------|-------|
| 1 | MVP: invoice → financing (Testnet) | 🔨 Devam ediyor |
| 2 | Anchor off-ramp (SEP-24) | ⏳ |
| 3 | Lending hardening (default, oracle FX) | ⏳ |
| 4 | Payroll streaming | ⏳ |
| 5 | Mainnet pilot | ⏳ |

---

© Can Sarıhan — MIT License
