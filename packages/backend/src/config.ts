import "dotenv/config";

/**
 * AnchorFlow backend configuration.
 * If contract addresses and the secret key are not provided, the server runs in
 * "sim" mode: the entire flow can be demonstrated locally (mirroring the contract math).
 * Author: Can Sarıhan
 */

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: Number(env("PORT", "3001")),
  publicBaseUrl: env("PUBLIC_BASE_URL", "http://localhost:3001"),

  network: {
    passphrase: env("NETWORK_PASSPHRASE", "Test SDF Network ; September 2015"),
    rpcUrl: env("SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"),
    horizonUrl: env("HORIZON_URL", "https://horizon-testnet.stellar.org"),
  },

  contracts: {
    invoiceToken: env("INVOICE_CONTRACT_ID"),
    lendingPool: env("LENDING_POOL_ID"),
    payrollStream: env("PAYROLL_STREAM_ID"),
    asset: env("ASSET_CONTRACT"),
  },

  pool: {
    advanceBps: Number(env("ADVANCE_BPS", "8500")),
    feeBps: Number(env("FEE_BPS", "200")),
  },

  // Server wallet (admin/operator). Empty means sim mode.
  signerSecret: env("SIGNER_SECRET"),
} as const;

/** Is everything required for live Soroban calls present? */
export function isLiveMode(): boolean {
  return Boolean(
    config.signerSecret &&
      config.contracts.invoiceToken &&
      config.contracts.lendingPool &&
      config.contracts.asset,
  );
}
