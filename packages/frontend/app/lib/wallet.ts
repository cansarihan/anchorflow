"use client";

/**
 * Wallet connector.
 *
 * MVP: the connected account is kept in localStorage (a demo that works in any environment).
 * Production integration point: call Freighter / Stellar Wallets Kit inside `connect()`
 * (getPublicKey). Author: Can Sarıhan
 */

const KEY = "anchorflow.account";

export function getAccount(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setAccount(address: string): void {
  window.localStorage.setItem(KEY, address.trim());
  window.dispatchEvent(new Event("anchorflow:account"));
}

export function disconnect(): void {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("anchorflow:account"));
}

/**
 * Get the address from Freighter if available; otherwise null (the UI falls back to manual entry).
 * In production: `import { getPublicKey, isConnected } from "@stellar/freighter-api"`.
 */
export async function connectFreighter(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    freighterApi?: { getPublicKey: () => Promise<string> };
  };
  if (w.freighterApi?.getPublicKey) {
    try {
      const pk = await w.freighterApi.getPublicKey();
      setAccount(pk);
      return pk;
    } catch {
      return null;
    }
  }
  return null;
}

export function isValidAddress(addr: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(addr.trim());
}
