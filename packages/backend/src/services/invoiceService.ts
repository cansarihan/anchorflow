import { randomUUID, createHash } from "node:crypto";
import { store } from "../store.js";
import { getLedger } from "../ledger/index.js";
import { config } from "../config.js";
import type { Invoice } from "../types.js";

/**
 * Fatura yaşam döngüsü servisi: oluştur -> kabul et.
 * Author: Can Sarıhan
 */

export interface CreateInvoiceInput {
  issuerAddress: string;
  payerEmail?: string;
  payerAddress?: string;
  amount: string;
  asset?: string;
  dueDate: string; // ISO
  documentRef?: string; // off-chain belge içeriği/uri (hash'lenir)
}

function docHashOf(input: CreateInvoiceInput, id: string): string {
  // Fatura belgesinin deterministik hash'i — zincire bağlanır (authenticity).
  const material = JSON.stringify({
    id,
    issuer: input.issuerAddress,
    amount: input.amount,
    due: input.dueDate,
    ref: input.documentRef ?? "",
  });
  return createHash("sha256").update(material).digest("hex");
}

/** Vade tarihini yaklaşık ledger sequence'a çevir (~5 sn/ledger). */
function dueLedger(dueDate: string): number {
  const secondsAhead = Math.max(
    0,
    Math.floor((new Date(dueDate).getTime() - Date.now()) / 1000),
  );
  // Mutlak ledger sequence backend'de bilinmediğinden göreli offset kullanılır;
  // canlı modda Soroban tarafı mevcut ledger'a ekler. MVP: offset/5.
  return Math.floor(secondsAhead / 5);
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const id = randomUUID();
  const docHash = docHashOf(input, id);
  const ledger = getLedger();

  const { onchainId } = await ledger.mintInvoice({
    issuerAddress: input.issuerAddress,
    payerAddress: input.payerAddress ?? null,
    amount: input.amount,
    dueLedger: dueLedger(input.dueDate),
    docHash,
  });

  const invoice: Invoice = {
    id,
    onchainId,
    issuerAddress: input.issuerAddress,
    payerEmail: input.payerEmail ?? null,
    payerAddress: input.payerAddress ?? null,
    amount: input.amount,
    asset: input.asset ?? "USDC",
    dueDate: input.dueDate,
    status: "Pending",
    docHash,
    payLink: `${config.publicBaseUrl}/pay/${id}`,
    createdAt: new Date().toISOString(),
  };

  return store.invoices.save(invoice);
}

export async function acceptInvoice(id: string): Promise<Invoice> {
  const invoice = store.invoices.get(id);
  if (!invoice) throw new Error("InvoiceNotFound");
  if (invoice.status !== "Pending") throw new Error("InvalidStatus");
  if (invoice.onchainId === null) throw new Error("NotMinted");

  await getLedger().acceptInvoice(invoice.onchainId);
  return store.invoices.update(id, { status: "Accepted" });
}

export function getInvoice(id: string): Invoice {
  const invoice = store.invoices.get(id);
  if (!invoice) throw new Error("InvoiceNotFound");
  return invoice;
}

export function listInvoices(issuer?: string): Invoice[] {
  return issuer ? store.invoices.listByIssuer(issuer) : store.invoices.all();
}
