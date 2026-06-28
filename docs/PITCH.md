# AnchorFlow — Stellar Startup Track Submission

**Programmable cross-border treasury & invoice-financing rails for the global
independent workforce.**

By **Can Sarıhan** · Built on **Stellar & Soroban** · **Live on Testnet**

---

## One line

AnchorFlow, sınırsız bağımsız iş gücünün doğrulanabilir gelirini (faturalarını)
zincir üstü krediye çeviren Stellar-native finansal işletim katmanıdır.
Bir cüzdan değil — **gelir altyapısı.**

---

## The problem

Bağımsız ekonomi artık sınır ötesi çalışan yüz milyonlarca insan demek; ama
altlarındaki para rayları hâlâ bankalar ve 3 günlük havaleler için tasarlanmış.

Başka ülkedeki bir müşteriye fatura kesen bağımsız bir çalışan tipik olarak:
- **%5–10'unu** FX spread'i ve havale ücretlerine kaptırır,
- ödemesini **3–7 gün** bekler,
- ve fatura vadesi müşteri tarafından dikte edildiği için **30–60 gün geç** alır.

En kötüsü: bu çalışan elinde gerçek, sözleşmeye dayalı bir **alacak** —
doğrulanabilir gelir — tutuyor, ama buna karşılık **tek kuruş borçlanamıyor.**
Çünkü geleneksel kredi sistemleri sınır ötesi, serbest-çalışan nakit akışını ne
görebiliyor ne de fiyatlayabiliyor. **Sermaye var; sadece onu kazanan insana
hiç ulaşmıyor.**

---

## The product — tek bir ödeme link'i, tam bir hazine yığını

1. **Her şeyde öde al, istediğinde al.** Müşteri kendi para biriminde/stablecoin'inde
   öder. Stellar **path payments** ile işlem, yerleşik DEX üzerinden otomatik
   yönlenip çalışanın seçtiği varlığa **~5 saniyede, kuruşun altında** settle olur.
   Muhabir banka yok, SWIFT yok.

2. **Anchor'lar ile yerel nakde çevir.** Stellar **anchor**'ları ve **SEP**
   standartları ile çalışan, yerel bankasına veya mobil paraya doğrudan
   off-ramp yapar — bankaların görmezden geldiği bölgelerde bile kullanılabilir.

3. **Faturayı tokenize et, geliri serbest bırak.** Kabul edilen her fatura,
   **Soroban** üzerinde tokenize bir RWA olarak basılır. Çalışan bu faturaya
   karşı, izinsiz (permissionless) bir kredi havuzundan **anında avans** çeker —
   60 gün yerine bugün faturanın **%80–90'ı**. Müşteri ödeyince akıllı sözleşme
   krediyi **otomatik kapatır.** Dünyadaki likidite sağlayıcılar spekülatif DeFi
   yerine gerçek **nakit-akışı destekli getiri** kazanır.

4. **Programlanabilir maaş akışı.** Uzak ekipler için Soroban sözleşmeleri
   saniye-bazlı maaş akışı ve milestone escrow sağlar. *(Roadmap; mimaride hazır.)*

---

## Why Stellar — ve neden yalnızca Stellar bunu temiz yapar

Bu ürün, jenerik bir zincirde zarif biçimde kurulamaz. Stellar dört primitive'i
tek yerde veriyor:

| Primitive | Neden kritik |
|-----------|--------------|
| **Anchors** | Düzenlenmiş fiat on/off-ramp — yerel ekonomilere köprü. *Başka kimsede yok; bunu "gerçek para" yapan kısım bu.* |
| **Path payments + native DEX** | Çok-para-birimli FX, üçüncü-parti API değil, **birinci sınıf** işlem. |
| **Sub-cent ücret + 5 sn finality** | Mikro-maaş akışı ve küçük-fatura financing'in **ekonomik olduğu tek model.** |
| **Soroban** | Faturayı güvenle tokenize eden ve kredi mantığını yürüten Rust sözleşmeleri. |

---

## Why it's technically hard (and worth doing)

Zorluk, üç zor sistemi tek güvenilir akışta birleştirmek:
- en iyi fiat ramp'ı koridor başına seçen **çok-anchor routing motoru**,
- DEX üzerinde slippage'i minimize eden **path-payment FX optimizer'ı**,
- ve fatura otantikliği, default, kısmi geri ödeme ve oracle-beslemeli FX riskinin
  başkalarının parasıyla **kanıtlanabilir güvende** olması gereken bir
  **Soroban RWA + lending protokolü.**

Zincir-dışı alacakların, zincir-üstü krediye karşı **deterministik** settle
olmasını sağlamak — çekirdek teknik ve güven problemi budur. Onu çözmek, bunu
bir ödeme uygulamasından **finansal altyapıya** dönüştüren şeydir.

---

## Traction — bu bir slayt değil, çalışıyor

> **Tüm invoice-financing çekirdeği Stellar Testnet'te canlı ve uçtan uca
> zincirde doğrulandı.**

Gerçek 4 hesapla (freelancer, müşteri, LP, admin) çalıştırılan canlı akış:

| Adım | On-chain sonuç |
|------|----------------|
| LP havuza yatırır | 10.000 USDC likidite |
| Freelancer 1.000 USDC fatura keser → müşteri kabul eder | InvoiceToken, `Accepted` |
| Freelancer avans çeker | havuz→freelancer **850 USDC**, `Financed` |
| Müşteri öder | payer→havuz **1.000**, havuz→freelancer **130**; kredi atomik kapanır |
| Final | freelancer **980**, havuz **10.020** (20 = LP yield), fatura `Paid` |

Aynı matematik üç katmanda da birebir tutuyor: kontrat birim testleri (**10/10**),
backend simülasyonu ve **canlı testnet.** Contract ID'ler ve explorer linkleri:
[`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Target users

1. **Sınır ötesi freelancer ve içerik üreticileri** — hızlı/ucuz ödeme + alacak financing'i isteyen.
2. **Dağıtık startup'lar ve DAO'lar** — küresel, çok-para-birimli maaş yürüten.
3. **Küçük dijital ihracatçı/ajanslar** — işletme sermayesine ihtiyaç duyan.
4. **Likidite sağlayıcılar** — token emisyonu değil, gerçek ekonomik aktiviteye dayalı getiri arayan.

---

## Business model

- Fatura financing iskonto spread'i (fee_bps),
- LP yield üzerinden protokol payı,
- işlem/settlement ücreti.

Net, gösterilebilir gelir → **"revenue milestones"** için doğal yol.

---

## Roadmap (milestone-based)

| # | Milestone | Durum |
|---|-----------|-------|
| 1 | MVP: invoice → financing (Testnet) | ✅ **Tamamlandı — canlı** |
| 2 | Anchor off-ramp (SEP-24) entegrasyonu | ⏳ |
| 3 | Lending hardening: default, partial repayment, oracle-fed FX | ⏳ |
| 4 | Programlanabilir maaş akışı (streaming payroll) | ⏳ |
| 5 | Mainnet pilot: çok-koridor, gerçek anchor'lar, ilk LP'ler & kullanıcı | ⏳ |

---

## Architecture (özet)

```
Frontend (Next.js)  ──►  Backend (Node/TS)  ──►  Stellar / Soroban
 3 panel                 ledger adapter            InvoiceToken (RWA)
 freelancer/pay/pool     sim ↔ live                LendingPool (avans + yield)
                         path-payment builder      DEX (path payments / FX)
                         SEP-24 anchor sim
```

Detay: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Demo runbook: [`DEMO.md`](DEMO.md)

---

**AnchorFlow başka bir cüzdan değil. Sınırsız iş gücünün gelir altyapısı — ve
Stellar'ın anchor'ları, path payment'ları ve Soroban'ı bunu bugün gerçek kılan
tek yığın.**

— Can Sarıhan
