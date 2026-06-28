import type { PathPaymentQuote, PoolStats, StreamView } from "../types.js";

/**
 * LedgerAdapter — an abstraction over AnchorFlow's on-chain operations.
 * Two implementations: SorobanLedger (live Stellar/Soroban) and SimLedger (local,
 * mirroring the contract math). Author: Can Sarıhan
 */

export interface MintInvoiceParams {
  issuerAddress: string;
  payerAddress: string | null;
  amount: string; // whole units
  dueLedger: number;
  docHash: string; // hex
}

export interface LedgerAdapter {
  readonly mode: "live" | "sim";

  /** Mint the invoice on the InvoiceToken contract. */
  mintInvoice(params: MintInvoiceParams): Promise<{ onchainId: number; txHash: string | null }>;

  /** Customer acceptance — a precondition for financing. */
  acceptInvoice(onchainId: number): Promise<{ txHash: string | null }>;

  /** Draw an advance against the invoice collateral. */
  borrow(onchainId: number, amount: string): Promise<{ advance: string; txHash: string | null }>;

  /** Customer payment — atomically close the loan. */
  repay(onchainId: number, faceValue: string): Promise<{ txHash: string | null }>;

  /** An LP deposits liquidity into the pool. */
  deposit(lpAddress: string, amount: string): Promise<{ shares: string; txHash: string | null }>;

  /** Pool statistics. */
  poolStats(): Promise<PoolStats>;

  /** Build/quote a path payment for a multi-currency payment. */
  buildPathPayment(params: {
    sourceAsset: string;
    destAsset: string;
    destAmount: string;
    sourceAddress: string;
    destAddress: string;
  }): Promise<PathPaymentQuote>;

  /** Create a programmable payroll stream (escrow). */
  createStream(params: {
    employer: string;
    employee: string;
    total: string;
    durationSeconds: number;
  }): Promise<{ streamId: number; txHash: string | null }>;

  /** Read the stream status + vesting information. */
  getStream(streamId: number): Promise<StreamView>;

  /** The employee withdraws the vested portion. */
  withdrawStream(streamId: number): Promise<{ amount: string; txHash: string | null }>;
}
