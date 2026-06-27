#!/usr/bin/env bash
#
# AnchorFlow — Testnet deploy script
# InvoiceToken + LendingPool kontratlarını Stellar Testnet'e yükler ve
# birbirine bağlar. Author: Can Sarıhan
#
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:-anchorflow}"   # stellar keys identity adı
ADVANCE_BPS="${ADVANCE_BPS:-8500}"  # %85 avans
FEE_BPS="${FEE_BPS:-200}"           # %2 financing fee

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_DIR="$ROOT/contracts/target/wasm32v1-none/release"

echo "▶ Kontratlar derleniyor..."
( cd "$ROOT/contracts" && stellar contract build )

echo "▶ InvoiceToken deploy ediliyor..."
INVOICE_ID=$(stellar contract deploy \
  --wasm "$WASM_DIR/invoice_token.wasm" \
  --source "$SOURCE" --network "$NETWORK")
echo "  InvoiceToken: $INVOICE_ID"

ADMIN=$(stellar keys address "$SOURCE")
echo "▶ InvoiceToken.init(admin=$ADMIN)"
stellar contract invoke --id "$INVOICE_ID" --source "$SOURCE" --network "$NETWORK" \
  -- init --admin "$ADMIN"

# USDC testnet SAC adresi env'den gelir; yoksa yeni bir test asset üretilebilir.
ASSET="${ASSET_CONTRACT:?ASSET_CONTRACT env değişkeni gerekli (USDC testnet SAC adresi)}"

echo "▶ LendingPool deploy ediliyor..."
POOL_ID=$(stellar contract deploy \
  --wasm "$WASM_DIR/lending_pool.wasm" \
  --source "$SOURCE" --network "$NETWORK")
echo "  LendingPool: $POOL_ID"

echo "▶ LendingPool.init(...)"
stellar contract invoke --id "$POOL_ID" --source "$SOURCE" --network "$NETWORK" \
  -- init \
  --admin "$ADMIN" \
  --asset "$ASSET" \
  --invoice_contract "$INVOICE_ID" \
  --advance_ratio_bps "$ADVANCE_BPS" \
  --fee_bps "$FEE_BPS"

echo "▶ InvoiceToken.set_pool($POOL_ID)"
stellar contract invoke --id "$INVOICE_ID" --source "$SOURCE" --network "$NETWORK" \
  -- set_pool --pool "$POOL_ID"

echo ""
echo "✅ Deploy tamam"
echo "   INVOICE_CONTRACT_ID=$INVOICE_ID"
echo "   LENDING_POOL_ID=$POOL_ID"
echo "   ASSET_CONTRACT=$ASSET"
