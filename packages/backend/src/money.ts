/**
 * Stellar 7-ondalık (stroop) para birimi yardımcıları.
 * String tam-birim <-> bigint stroop dönüşümü. Author: Can Sarıhan
 */

const DECIMALS = 7n;
const SCALE = 10n ** DECIMALS;

/** "1000.50" -> 10005000000n */
export function toStroops(units: string): bigint {
  const [whole, frac = ""] = units.trim().split(".");
  const fracPadded = (frac + "0".repeat(7)).slice(0, 7);
  const sign = whole.startsWith("-") ? -1n : 1n;
  const wholeAbs = whole.replace("-", "") || "0";
  return sign * (BigInt(wholeAbs) * SCALE + BigInt(fracPadded || "0"));
}

/** 10005000000n -> "1000.50" (gereksiz sıfırlar kırpılır) */
export function fromStroops(stroops: bigint): string {
  const sign = stroops < 0n ? "-" : "";
  const abs = stroops < 0n ? -stroops : stroops;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}

/** basis-point oranı uygula: amount * bps / 10000 */
export function applyBps(stroops: bigint, bps: number): bigint {
  return (stroops * BigInt(bps)) / 10_000n;
}
