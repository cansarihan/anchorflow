/**
 * AnchorFlow shared types. Author: Can Sarıhan
 */

export type InvoiceStatus =
  | "Pending"
  | "Accepted"
  | "Financed"
  | "Paid"
  | "Defaulted";

export interface Invoice {
  id: string; // off-chain UUID
  onchainId: number | null; // id in the InvoiceToken contract
  issuerAddress: string; // freelancer's Stellar address
  payerEmail: string | null;
  payerAddress: string | null;
  amount: string; // whole units, string (e.g. "1000.00")
  asset: string; // settlement asset code (e.g. "USDC")
  dueDate: string; // ISO date
  status: InvoiceStatus;
  docHash: string; // off-chain document hash (hex, 32 bytes)
  payLink: string;
  createdAt: string;
}

export interface Loan {
  invoiceId: string;
  borrower: string;
  principal: string; // advance paid out
  faceValue: string; // invoice amount
  status: "Active" | "Repaid" | "Defaulted";
  txHash: string | null;
}

export interface PoolStats {
  liquidity: string;
  borrowed: string;
  utilizationBps: number;
}

export interface StreamView {
  id: number;
  employer: string;
  employee: string;
  total: string;
  withdrawn: string;
  vested: string;
  withdrawable: string;
  status: "Active" | "Cancelled" | "Completed";
  startAt: string | null; // ISO (for UI progress in sim mode)
  endAt: string | null;
  txHash: string | null;
}

export interface PathPaymentQuote {
  sourceAsset: string;
  destAsset: string;
  sendAmount: string;
  estimatedDestAmount: string;
  xdr: string | null; // unsigned transaction envelope (null in sim mode)
}
