#!/usr/bin/env bash
#
# AnchorFlow — backend uçtan uca duman testi (sim modu).
# Backend'i çalıştırır, invoice -> accept -> finance -> settle akışını sürer.
# Kullanım: ./scripts/smoke_backend.sh   (backend http://localhost:3055)
# Author: Can Sarıhan
#
set -euo pipefail

B="${B:-http://localhost:3055}"
gen() { node -e "console.log(require('@stellar/stellar-sdk').Keypair.random().publicKey())"; }
jget() { node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).$1))"; }

cd "$(dirname "${BASH_SOURCE[0]}")/../packages/backend"

ISSUER=$(gen); PAYER=$(gen)

echo "▶ 1) Havuz başlangıç"; curl -s "$B/pool/stats"; echo
echo "▶ 2) Fatura oluştur (1000 USDC)"
INV=$(curl -s -X POST "$B/invoices" -H 'content-type: application/json' \
  -d "{\"issuerAddress\":\"$ISSUER\",\"payerAddress\":\"$PAYER\",\"amount\":\"1000\",\"dueDate\":\"2026-08-28\",\"documentRef\":\"contract-xyz\"}")
echo "$INV"; ID=$(echo "$INV" | jget id)

echo "▶ 3) Kabul";   curl -s -X POST "$B/invoices/$ID/accept" > /dev/null && echo "  Accepted"
echo "▶ 4) Avans";   curl -s -X POST "$B/invoices/$ID/finance"; echo
echo "▶ 5) Havuz (avans sonrası)"; curl -s "$B/pool/stats"; echo
echo "▶ 6) Path-payment teklifi (EURC ile öder)"
curl -s -X POST "$B/pay/$ID/quote" -H 'content-type: application/json' \
  -d "{\"sourceAsset\":\"EURC:$ISSUER\",\"payerAddress\":\"$PAYER\"}"; echo
echo "▶ 7) Settle (kredi atomik kapanır)"
curl -s -X POST "$B/pay/$ID/settle" > /dev/null && echo "  Settled"
echo "▶ 8) Havuz (fee = LP yield)"; curl -s "$B/pool/stats"; echo
