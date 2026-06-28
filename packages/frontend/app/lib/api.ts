/**
 * AnchorFlow backend API istemcisi. /api/* -> backend (next rewrite).
 * Author: Can Sarıhan
 */

export type InvoiceStatus =
  | "Pending"
  | "Accepted"
  | "Financed"
  | "Paid"
  | "Defaulted";

export interface Invoice {
  id: string;
  onchainId: number | null;
  issuerAddress: string;
  payerAddress: string | null;
  amount: string;
  asset: string;
  dueDate: string;
  status: InvoiceStatus;
  docHash: string;
  payLink: string;
  createdAt: string;
}

export interface Loan {
  invoiceId: string;
  borrower: string;
  principal: string;
  faceValue: string;
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
  xdr: string | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ ok: boolean; mode: string }>("/health"),

  createInvoice: (input: {
    issuerAddress: string;
    payerAddress?: string;
    payerEmail?: string;
    amount: string;
    dueDate: string;
    documentRef?: string;
  }) =>
    req<Invoice>("/invoices", { method: "POST", body: JSON.stringify(input) }),

  listInvoices: (issuer?: string) =>
    req<Invoice[]>(`/invoices${issuer ? `?issuer=${issuer}` : ""}`),

  getInvoice: (id: string) => req<Invoice>(`/invoices/${id}`),

  accept: (id: string) =>
    req<Invoice>(`/invoices/${id}/accept`, { method: "POST" }),

  finance: (id: string) =>
    req<Loan>(`/invoices/${id}/finance`, { method: "POST" }),

  payInfo: (id: string) =>
    req<{
      invoiceId: string;
      amount: string;
      asset: string;
      payTo: string;
      status: InvoiceStatus;
    }>(`/pay/${id}`),

  quote: (id: string, sourceAsset: string, payerAddress: string) =>
    req<PathPaymentQuote>(`/pay/${id}/quote`, {
      method: "POST",
      body: JSON.stringify({ sourceAsset, payerAddress }),
    }),

  settle: (id: string) =>
    req<{ invoice: Invoice; loan: Loan | null }>(`/pay/${id}/settle`, {
      method: "POST",
    }),

  poolStats: () => req<PoolStats>("/pool/stats"),

  deposit: (lpAddress: string, amount: string) =>
    req<{ shares: string }>("/pool/deposit", {
      method: "POST",
      body: JSON.stringify({ lpAddress, amount }),
    }),

  anchorStart: (input: {
    kind: "deposit" | "withdraw";
    asset: string;
    amount: string;
    account: string;
  }) =>
    req<AnchorTransaction>("/anchor/transactions", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  anchorComplete: (id: string) =>
    req<AnchorTransaction>(`/anchor/transactions/${id}/complete`, {
      method: "POST",
    }),
};

export interface AnchorTransaction {
  id: string;
  kind: "deposit" | "withdraw";
  asset: string;
  amount: string;
  account: string;
  status:
    | "incomplete"
    | "pending_user_transfer_start"
    | "pending_anchor"
    | "completed";
  interactiveUrl: string;
  createdAt: string;
}
