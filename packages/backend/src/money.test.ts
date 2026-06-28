import { test } from "node:test";
import assert from "node:assert/strict";
import { toStroops, fromStroops, applyBps } from "./money.js";

/** money.ts unit tests — Author: Can Sarıhan */

test("toStroops: integer", () => {
  assert.equal(toStroops("1000"), 10_000_000_000n);
});

test("toStroops: decimal", () => {
  assert.equal(toStroops("1000.50"), 10_005_000_000n);
  assert.equal(toStroops("0.0000001"), 1n);
});

test("toStroops: digits beyond 7 decimals are truncated", () => {
  assert.equal(toStroops("1.123456789"), 11_234_567n);
});

test("fromStroops: trims trailing zeros", () => {
  assert.equal(fromStroops(10_000_000_000n), "1000");
  assert.equal(fromStroops(10_005_000_000n), "1000.5");
  assert.equal(fromStroops(1n), "0.0000001");
});

test("round-trip", () => {
  for (const v of ["0", "1", "1000.5", "0.0000001", "123456.7891011"]) {
    assert.equal(fromStroops(toStroops(v)), v.replace(/\.?0+$/, "") || "0");
  }
});

test("applyBps: 85% and 2%", () => {
  assert.equal(applyBps(10_000_000_000n, 8500), 8_500_000_000n); // 1000 -> 850
  assert.equal(applyBps(10_000_000_000n, 200), 200_000_000n); // 1000 -> 20
});
