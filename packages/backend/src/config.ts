import "dotenv/config";

/**
 * AnchorFlow backend yapılandırması.
 * Kontrat adresleri ve gizli anahtar verilmemişse sunucu "sim" modunda çalışır:
 * tüm akış yerel olarak (kontrat matematiğinin aynası ile) gösterilebilir.
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
    asset: env("ASSET_CONTRACT"),
  },

  pool: {
    advanceBps: Number(env("ADVANCE_BPS", "8500")),
    feeBps: Number(env("FEE_BPS", "200")),
  },

  // Sunucu cüzdanı (admin/işlemci). Boşsa sim modu.
  signerSecret: env("SIGNER_SECRET"),
} as const;

/** Canlı Soroban çağrıları için gerekli her şey var mı? */
export function isLiveMode(): boolean {
  return Boolean(
    config.signerSecret &&
      config.contracts.invoiceToken &&
      config.contracts.lendingPool &&
      config.contracts.asset,
  );
}
