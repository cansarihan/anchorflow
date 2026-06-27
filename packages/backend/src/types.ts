/**
 * AnchorFlow ortak tipleri. Author: Can Sarıhan
 */

export type InvoiceStatus =
  | "Pending"
  | "Accepted"
  | "Financed"
  | "Paid"
  | "Defaulted";

export interface Invoice {
  id: string; // off-chain UUID
  onchainId: number | null; // InvoiceToken kontratındaki id
  issuerAddress: string; // freelancer Stellar adresi
  payerEmail: string | null;
  payerAddress: string | null;
  amount: string; // tam birim, string (örn. "1000.00")
  asset: string; // settlement varlığı kodu (örn. "USDC")
  dueDate: string; // ISO tarih
  status: InvoiceStatus;
  docHash: string; // off-chain belge hash'i (hex, 32 byte)
  payLink: string;
  createdAt: string;
}

export interface Loan {
  invoiceId: string;
  borrower: string;
  principal: string; // ödenen avans
  faceValue: string; // fatura tutarı
  status: "Active" | "Repaid" | "Defaulted";
  txHash: string | null;
}

export interface PoolStats {
  liquidity: string;
  borrowed: string;
  utilizationBps: number;
}

export interface PathPaymentQuote {
  sourceAsset: string;
  destAsset: string;
  sendAmount: string;
  estimatedDestAmount: string;
  xdr: string | null; // imzasız işlem zarfı (sim modunda null)
}
