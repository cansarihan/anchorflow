# AnchorFlow — Demo Video Script (~85s)

A scene-by-scene storyboard for a 60–90 second submission video. **Author: Can Sarıhan.**

> Goal: show the product *working* in one continuous "Lagos → Berlin" story, then
> prove it's real on-chain. Confident founder voice; no jargon dumps.

---

## Production setup (before recording)

Run the app in **sim mode** (works offline, no wallet extension needed):

```bash
# Terminal 1
cd packages/backend && PORT=3001 npm run dev
# Terminal 2
cd packages/frontend && npm run dev      # http://localhost:3000
```

- Open `http://localhost:3000`, connect a demo `G…` address (top-right) — this is "the freelancer".
- Pre-seed one invoice so the list isn't empty: create a **1,000 USDC** invoice, leave it **Pending** (you'll accept + finance it on camera).
- Record at **1080p+**, browser zoom ~110%, hide bookmarks bar. Use smooth, deliberate clicks.
- Have a second tab open on **stellar.expert** (a real testnet tx from `docs/DEPLOYMENT.md`) for the on-chain proof shot.

---

## Storyboard

| Time | On screen | Voiceover |
|------|-----------|-----------|
| **0:00–0:08** | Landing page (`/`), slow scroll over the hero | "A freelancer in Lagos invoices a client in Berlin for a thousand dollars. Today she loses up to 10% to fees, waits a week to get paid — and 60 days for the invoice to clear. AnchorFlow fixes all three." |
| **0:08–0:24** | `/invoice` — create invoice, click **Accept (demo)**, then **Draw advance**; the row flips to `Financed` | "She issues the invoice on AnchorFlow — tokenized on Stellar's Soroban. The moment her client accepts, she draws an instant 85% advance from a permissionless pool. Eight hundred fifty dollars, today — instead of in sixty days." |
| **0:24–0:40** | `/pay/<id>` — select **EURC**, click **Get rate quote**, then **Pay** → toast "loan repaid automatically" | "Her client pays in euros. Stellar path payments route it through the on-chain DEX and settle in USDC in about five seconds, for a fraction of a cent. No banks, no SWIFT — and the smart contract closes her loan automatically." |
| **0:40–0:52** | `/cashout` — click **Start off-ramp**, then **Sent to bank** → `Completed` | "She cashes out to her local bank through a Stellar anchor — even in regions banks ignore." |
| **0:52–1:04** | `/payroll` — create a stream; the **vesting bar fills live** | "And for distributed teams, salary streams by the second. Contributors withdraw exactly what they've earned, whenever they want." |
| **1:04–1:16** | `/pool` (show liquidity + utilization), then **cut to stellar.expert** showing a real testnet transaction | "Liquidity providers earn real, cash-flow-backed yield. And this isn't a mockup — three contracts are live on Stellar testnet, every transaction verifiable on-chain." |
| **1:16–1:25** | AnchorFlow logo / landing hero, fade | "AnchorFlow. Income infrastructure for the borderless workforce." |

---

## Tips

- **Lead with the working product, not slides.** The first 10 seconds decide whether they keep watching.
- Keep the cursor moving with intent; pre-fill text fields off-camera so you're not typing addresses live.
- The **two strongest beats**: the *instant advance* (0:08–0:24) and the *on-chain proof* (1:04–1:16). Let those breathe.
- End on the one-liner. Don't trail off into a feature list.
- Optional lower-third captions reinforcing: "Tokenized invoice (RWA) · Soroban", "Path payment · 5s · sub-cent", "Live on Stellar Testnet".

---

## One-sentence version (if a 30s cut is needed)

> "AnchorFlow turns a freelancer's unpaid cross-border invoice into instant cash —
> tokenized on Soroban, financed from a permissionless pool, settled via Stellar
> path payments, and cashed out through anchors — live on testnet today."
