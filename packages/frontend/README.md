# AnchorFlow — Frontend

Next.js (App Router) üç panel: freelancer, müşteri ödeme, likidite sağlayıcı.
**Author: Can Sarıhan.**

## Sayfalar

| Yol | Panel |
|-----|-------|
| `/` | Landing |
| `/invoice` | Freelancer: fatura oluştur, kabul (demo), avans çek |
| `/pay/[id]` | Müşteri: kur teklifi + öde (atomik kredi kapanışı) |
| `/payroll` | Maaş akışı: oluştur (escrow) + canlı vesting + çek |
| `/cashout` | Anchor off-ramp (SEP-24): USDC'yi yerel nakde çevir |
| `/pool` | LP: havuz istatistikleri + likidite yatır |

## Çalıştırma

Backend'i ayrı çalıştırın (varsayılan `:3001`), sonra:

```bash
npm install
npm run dev          # http://localhost:3000
```

`/api/*` istekleri `BACKEND_URL`'e (varsayılan `http://localhost:3001`)
yönlendirilir. **Not:** Next.js `rewrites` build sırasında sabitlenir; `npm run
build` öncesi farklı bir backend için `BACKEND_URL`'i export edin. `npm run dev`
bu değişkeni başlangıçta okur.

## Cüzdan

MVP'de bağlı hesap manuel G… adresi olarak `localStorage`'da tutulur (her
ortamda çalışan demo). Üretim entegrasyon noktası `app/lib/wallet.ts` →
`connectFreighter()` içindedir (Freighter / Stellar Wallets Kit).
