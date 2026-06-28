import { config, isLiveMode } from "../config.js";
import type { LedgerAdapter } from "./types.js";
import { SimLedger } from "./sim.js";
import { SorobanLedger } from "./soroban.js";

/**
 * Select the live or sim ledger based on configuration. Author: Can Sarıhan
 */
let instance: LedgerAdapter | null = null;

export function getLedger(): LedgerAdapter {
  if (!instance) {
    instance = isLiveMode() ? new SorobanLedger() : new SimLedger();
    console.log(
      `[ledger] mode: ${instance.mode}` +
        (instance.mode === "sim"
          ? " (contract addresses/signing not configured — local demo)"
          : ` (network: ${config.network.rpcUrl})`),
    );
  }
  return instance;
}

export type { LedgerAdapter } from "./types.js";
