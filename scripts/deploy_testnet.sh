#!/usr/bin/env bash
#
# AnchorFlow — Testnet deploy script
# Deploys the InvoiceToken + LendingPool contracts to Stellar Testnet and
# wires them together. Author: Can Sarıhan
#
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:-anchorflow}"   # stellar keys identity name
ADVANCE_BPS="${ADVANCE_BPS:-8500}"  # 85% advance
FEE_BPS="${FEE_BPS:-200}"           # 2% financing fee

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_DIR="$ROOT/contracts/target/wasm32v1-none/release"

echo "▶ Building contracts..."
( cd "$ROOT/contracts" && stellar contract build )

echo "▶ Deploying InvoiceToken..."
INVOICE_ID=$(stellar contract deploy \
  --wasm "$WASM_DIR/invoice_token.wasm" \
  --source "$SOURCE" --network "$NETWORK")
echo "  InvoiceToken: $INVOICE_ID"

ADMIN=$(stellar keys address "$SOURCE")
echo "▶ InvoiceToken.init(admin=$ADMIN)"
stellar contract invoke --id "$INVOICE_ID" --source "$SOURCE" --network "$NETWORK" \
  --send=yes -- init --admin "$ADMIN"

# The USDC testnet SAC address comes from env; otherwise a new test asset can be generated.
ASSET="${ASSET_CONTRACT:?ASSET_CONTRACT env variable required (USDC testnet SAC address)}"

echo "▶ Deploying LendingPool..."
POOL_ID=$(stellar contract deploy \
  --wasm "$WASM_DIR/lending_pool.wasm" \
  --source "$SOURCE" --network "$NETWORK")
echo "  LendingPool: $POOL_ID"

echo "▶ LendingPool.init(...)"
stellar contract invoke --id "$POOL_ID" --source "$SOURCE" --network "$NETWORK" \
  --send=yes -- init \
  --admin "$ADMIN" \
  --asset "$ASSET" \
  --invoice_contract "$INVOICE_ID" \
  --advance_ratio_bps "$ADVANCE_BPS" \
  --fee_bps "$FEE_BPS"

echo "▶ InvoiceToken.set_pool($POOL_ID)"
stellar contract invoke --id "$INVOICE_ID" --source "$SOURCE" --network "$NETWORK" \
  --send=yes -- set_pool --pool "$POOL_ID"

echo ""
echo "✅ Deploy complete"
echo "   INVOICE_CONTRACT_ID=$INVOICE_ID"
echo "   LENDING_POOL_ID=$POOL_ID"
echo "   ASSET_CONTRACT=$ASSET"
