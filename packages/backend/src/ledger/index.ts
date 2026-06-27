import { config, isLiveMode } from "../config.js";
import type { LedgerAdapter } from "./types.js";
import { SimLedger } from "./sim.js";
import { SorobanLedger } from "./soroban.js";

/**
 * Yapılandırmaya göre canlı veya sim ledger seç. Author: Can Sarıhan
 */
let instance: LedgerAdapter | null = null;

export function getLedger(): LedgerAdapter {
  if (!instance) {
    instance = isLiveMode() ? new SorobanLedger() : new SimLedger();
    console.log(
      `[ledger] mod: ${instance.mode}` +
        (instance.mode === "sim"
          ? " (kontrat adresleri/imza ayarlanmadı — yerel demo)"
          : ` (network: ${config.network.rpcUrl})`),
    );
  }
  return instance;
}

export type { LedgerAdapter } from "./types.js";
