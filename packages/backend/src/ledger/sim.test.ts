import { test } from "node:test";
import assert from "node:assert/strict";
import { SimLedger } from "./sim.js";

/**
 * SimLedger financing flow tests — must match the contract math.
 * Author: Can Sarıhan
 */

const ADDR = "GBHOCQMBQHAVMFSCWWN4MOODBAADITSI3N5JB3FNMOLFNIUOXSGDUZAN";

test("initial pool starts with seed liquidity", async () => {
  const l = new SimLedger();
  const s = await l.poolStats();
  assert.equal(s.liquidity, "100000");
  assert.equal(s.borrowed, "0");
  assert.equal(s.utilizationBps, 0);
});

test("borrow gives an 85% advance and increases borrowed", async () => {
  const l = new SimLedger();
  const { onchainId } = await l.mintInvoice({
    issuerAddress: ADDR,
    payerAddress: ADDR,
    amount: "1000",
    dueLedger: 100,
    docHash: "aa",
  });
  const { advance } = await l.borrow(onchainId, "1000");
  assert.equal(advance, "850");
  const s = await l.poolStats();
  assert.equal(s.borrowed, "850");
  assert.equal(s.utilizationBps, 85); // 850/100000 = 0.85% = 85 bps
});

test("repay closes the loan and adds the fee as LP yield", async () => {
  const l = new SimLedger();
  const { onchainId } = await l.mintInvoice({
    issuerAddress: ADDR,
    payerAddress: ADDR,
    amount: "1000",
    dueLedger: 100,
    docHash: "aa",
  });
  await l.borrow(onchainId, "1000");
  await l.repay(onchainId, "1000");
  const s = await l.poolStats();
  assert.equal(s.borrowed, "0");
  assert.equal(s.liquidity, "100020"); // 100000 + 20 fee (2%)
});

test("borrow fails when liquidity is insufficient", async () => {
  const l = new SimLedger();
  const { onchainId } = await l.mintInvoice({
    issuerAddress: ADDR,
    payerAddress: ADDR,
    amount: "200000", // larger than the pool
    dueLedger: 100,
    docHash: "aa",
  });
  await assert.rejects(() => l.borrow(onchainId, "200000"), /InsufficientLiquidity/);
});

test("createStream: active stream + escrow total", async () => {
  const l = new SimLedger();
  const { streamId } = await l.createStream({
    employer: ADDR,
    employee: ADDR,
    total: "1000",
    durationSeconds: 3600,
  });
  const s = await l.getStream(streamId);
  assert.equal(s.total, "1000");
  assert.equal(s.withdrawn, "0");
  assert.equal(s.status, "Active");
});

test("getStream: a nonexistent stream errors", async () => {
  const l = new SimLedger();
  await assert.rejects(() => l.getStream(999), /StreamNotFound/);
});

test("path-payment quote adds a spread", async () => {
  const l = new SimLedger();
  const q = await l.buildPathPayment({
    sourceAsset: "EURC",
    destAsset: "USDC",
    destAmount: "1000",
  });
  assert.equal(q.estimatedDestAmount, "1000");
  assert.equal(q.sendAmount, "1001"); // ~0.1% spread
});
