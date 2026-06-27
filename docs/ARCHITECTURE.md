# AnchorFlow — Mimari & Proje Planı

**Author:** Can Sarıhan
**Track:** Stellar Startup Track
**Doküman:** MVP Mimarisi ve Yol Haritası
**Versiyon:** 0.1 — MVP Çekirdeği: *Invoice → Financing* Tam Akışı

---

## 1. Vizyon (Tek Cümle)

> AnchorFlow, sınır ötesi çalışan bağımsız iş gücünün doğrulanabilir gelirini (faturalarını) zincir üstü krediye dönüştüren, Stellar-native bir finansal işletim katmanıdır.

AnchorFlow bir cüzdan değildir; **gelir altyapısıdır.** Bir freelancer, bağımsız ekip veya küçük dijital işletme; ödeme alır, para birimini dönüştürür ve **henüz tahsil edilmemiş faturasına karşı anında avans çeker.**

---

## 2. MVP'nin Sınırı (Scope)

Pitch'te dört yetenek anlatılır (cross-border ödeme, anchor on/off-ramp, invoice financing, payroll streaming). **MVP'de yalnızca tek bir bütünleşik akış uçtan uca çalışır:**

```
Invoice link  →  path-payment ile çok-para-birimli ödeme  →  fatura Soroban'da tokenize
                       →  lending pool'dan anında avans  →  müşteri ödeyince smart contract otomatik kapanış
```

### Kapsamda (MVP)
- ✅ Fatura oluşturma + paylaşılabilir ödeme link'i
- ✅ Stellar **path payment** ile çok para birimli settlement (DEX üzerinden FX)
- ✅ Soroban **Invoice Token** kontratı (her fatura = bir RWA token)
- ✅ Soroban **Lending Pool** kontratı (tek havuz, tek varlık — USDC testnet)
- ✅ Avans çekme → müşteri ödemesi → otomatik geri ödeme (deterministik settlement)
- ✅ LP (likidite sağlayıcı) yatırım/çekim ve yield gösterimi

### Kapsam dışı (sonraki milestone'lar)
- ❌ Gerçek mainnet anchor (testnet sim ile gösterilir)
- ❌ Payroll streaming (mimaride yer ayrılır, kodlanmaz)
- ❌ Çok-koridorlu anchor routing engine
- ❌ Oracle-fed FX risk modeli (basit sabit oran ile temsil edilir)
- ❌ Gelişmiş default/likidasyon mekaniği (MVP'de basit kural)

---

## 3. Sistem Mimarisi (Yüksek Seviye)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js)                         │
│   Freelancer Panel  │  Client Pay Page  │  LP / Pool Dashboard       │
│        Freighter / Stellar Wallets Kit ile cüzdan bağlama            │
└───────────────┬─────────────────────────────────┬───────────────────┘
                │ REST / RPC                       │ Cüzdan imza (client-side)
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

**Tasarım ilkesi:** Para ve kredi mantığı **zincir üstünde** (Soroban), kullanıcı dostu metadata ve link yönetimi **zincir dışında** (DB) tutulur. Güven gerektiren her şey kontratta; UX kolaylığı backend'de.

---

## 4. Çekirdek Akış — Adım Adım

### Aşama A — Fatura oluşturma ve ödeme
1. Freelancer panelde fatura oluşturur: tutar (örn. 1000 USDC), müşteri, vade (örn. 60 gün), kabul edilen ödeme para birimleri.
2. Backend paylaşılabilir bir **ödeme link'i** üretir (`/pay/:invoiceId`).
3. Müşteri link'i açar, kendi para biriminde/stablecoin'inde öder.
4. Backend bir **path payment** oluşturur: müşterinin varlığı → Stellar DEX → freelancer'ın seçtiği varlık (~5 sn, sub-cent). FX, DEX üzerinden first-class operation olarak çözülür.

### Aşama B — Faturayı tokenize et (RWA)
5. Müşteri faturayı "kabul" ettiğinde (MVP'de ödeme niyeti/onay imzası ile temsil edilir), backend `InvoiceToken.mint()` çağırır.
6. Her fatura **benzersiz bir token** olarak basılır; sahibi freelancer'dır. Token metadata: tutar, vade, müşteri, durum (`Pending / Financed / Paid / Defaulted`).

### Aşama C — Avans çek (financing)
7. Freelancer `LendingPool.borrow(invoiceTokenId)` çağırır.
8. Pool, faturayı teminat olarak kilitler ve **fatura değerinin %80–90'ını** anında freelancer'a öder.
9. Pool'daki likidite, dünya çapındaki LP'lerden gelir; faiz/iskonto onların yield'idir.

### Aşama D — Otomatik settlement
10. Vade geldiğinde müşteri faturayı öder (ödeme link'i üzerinden).
11. Ödeme pool'a yönlenir; smart contract **krediyi otomatik kapatır**, kalan tutarı freelancer'a aktarır, faiz LP'lere dağıtılır.
12. Müşteri ödemezse: token `Defaulted` olur, MVP'de basit kural (teminat/risk fonu) ile temsil edilir; gerçek likidasyon Milestone 3.

---

## 5. Soroban Kontrat Tasarımı

### 5.1 `InvoiceToken` Kontratı
Faturayı zincir üstünde tokenize eden RWA kontratı.

**Storage:**
```
Invoice {
  id: u64,
  issuer: Address,        // freelancer
  payer: Address,         // müşteri (opsiyonel/known)
  amount: i128,           // fatura tutarı (stroops/7-decimal)
  asset: Address,         // settlement varlığı (USDC)
  due_ledger: u32,        // vade (ledger sequence)
  status: Status,         // Pending | Accepted | Financed | Paid | Defaulted
  doc_hash: BytesN<32>,   // off-chain fatura belgesinin hash'i (authenticity)
}
```

**Fonksiyonlar:**
- `mint(issuer, amount, asset, due, doc_hash) -> id`
- `accept(id)` — müşteri kabul imzası (financing ön koşulu)
- `mark_financed(id, pool)` — yalnızca LendingPool çağırabilir
- `mark_paid(id)` / `mark_defaulted(id)`
- `get(id) -> Invoice`

> **Authenticity (çekirdek güven problemi):** `doc_hash` ile off-chain fatura belgesi zincire bağlanır. MVP'de "accept" adımı müşteri onayını temsil eder. Sonraki milestone'da: e-imza, müşteri attestation, oracle doğrulaması.

### 5.2 `LendingPool` Kontratı
Fatura teminatına karşı avans veren ve LP yield dağıtan havuz.

**Storage:**
```
Pool {
  asset: Address,             // USDC
  total_liquidity: i128,
  total_borrowed: i128,
  advance_ratio: u32,         // örn. 8500 = %85
  fee_bps: u32,               // financing iskonto/faiz
  shares: Map<Address,i128>,  // LP payları
}
Loan {
  invoice_id: u64,
  borrower: Address,
  principal: i128,
  status: LoanStatus,
}
```

**Fonksiyonlar:**
- `deposit(lp, amount)` / `withdraw(lp, shares)` — LP likiditesi
- `borrow(invoice_id)` — faturayı kilitle, avans öde, `mark_financed` çağır
- `repay(invoice_id, amount)` — müşteri ödemesi; krediyi kapat, kalanı issuer'a, fee'yi LP'lere
- `handle_default(invoice_id)` — MVP basit kural
- `pool_stats() -> (liquidity, borrowed, utilization, apy)`

**Deterministik settlement (kritik):** `repay` çağrıldığında tüm dağıtım tek transaction içinde atomik gerçekleşir — off-chain receivable, on-chain credit'e karşı **provably** kapanır. Senin pitch'te "core technical and trust problem" dediğin nokta tam burada çözülür.

---

## 6. Modül / Repo Yapısı

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
│   │   │   ├── invoice/        # fatura servisi
│   │   │   ├── payments/       # path-payment builder
│   │   │   ├── soroban/        # kontrat çağrı orkestrasyonu
│   │   │   ├── anchor/         # SEP-24 simulator
│   │   │   └── indexer/        # event listener
│   │   └── package.json
│   ├── frontend/               # Next.js
│   │   ├── app/
│   │   │   ├── invoice/        # freelancer paneli
│   │   │   ├── pay/[id]/       # müşteri ödeme sayfası
│   │   │   └── pool/           # LP dashboard
│   │   └── package.json
│   └── shared/                 # ortak tipler, ABI, asset config
├── docs/
│   └── ARCHITECTURE.md
└── README.md
```

---

## 7. Teknoloji Stack

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| Smart contracts | Soroban (Rust) | Güvenli RWA + lending mantığı |
| Ödeme / FX | Stellar SDK (JS) | Path payments, native DEX, SEP-10 |
| Anchor | SEP-24 / SEP-31 (testnet sim) | Yerel fiat on/off-ramp köprüsü |
| Backend | Node.js + TypeScript | Tx orkestrasyon, indexer |
| Veritabanı | PostgreSQL | Off-chain metadata, link state |
| Frontend | Next.js + Stellar Wallets Kit | Freighter cüzdan, 3 panel |
| Network | Testnet → Futurenet → Mainnet | Aşamalı geçiş |

---

## 8. Veri Modeli (Off-chain, Postgres)

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

## 9. Güven & Güvenlik Notları

| Risk | MVP yaklaşımı | Sonraki milestone |
|------|---------------|-------------------|
| Fatura sahteciliği | `doc_hash` + müşteri `accept` imzası | E-imza, müşteri attestation, oracle |
| Çifte financing | Token `status` kontratta kilitlenir | — |
| Default | Basit risk-fonu kuralı | Tam likidasyon + kredi skoru |
| FX riski | Sabit/temsa oran | Oracle-fed dinamik oran |
| LP fon güvenliği | Atomik settlement, audited contract pattern | Bağımsız audit |
| Reentrancy / yetki | Soroban auth + checks-effects pattern | Formal review |

---

## 10. Milestone Yol Haritası

| # | Milestone | Çıktı |
|---|-----------|-------|
| **1** | **MVP (hackathon)** | Invoice link → path-payment → InvoiceToken → tek LendingPool → otomatik settlement. Testnet'te uçtan uca çalışan demo. |
| 2 | Anchor off-ramp | SEP-24 testnet anchor entegrasyonu, yerel cash-out sim. |
| 3 | Lending hardening | Default handling, partial repayment, oracle-fed FX risk. |
| 4 | Payroll streaming | Soroban ile saniye-bazlı maaş + milestone escrow. |
| 5 | Mainnet pilot | Çok-koridor, gerçek anchor, ilk LP'ler, ilk gerçek kullanıcı. |

---

## 11. Demo Senaryosu (Jüri için)

> "Lagos'taki bir freelancer, Berlin'deki müşterisine 1000 USDC fatura keser. Müşteri EURC ile öder — path payment ~5 saniyede USDC'ye çevirir. Freelancer 60 gün beklemek yerine, faturasını tokenize edip pool'dan **850 USDC'yi anında** çeker. 60 gün sonra müşteri ödediğinde, smart contract krediyi otomatik kapatır, freelancer kalanı alır, dünyanın öbür ucundaki LP gerçek nakit-akışı destekli yield kazanır. Tek bir bankaya, tek bir SWIFT mesajına dokunmadan."

Bu 90 saniyelik demo, anlatının tamamını (cross-border + RWA + financing + global LP) tek akışta kanıtlar.

---

*Tüm tasarım, kod ve dokümantasyon Can Sarıhan'a aittir.*
