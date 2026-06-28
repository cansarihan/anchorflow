import { store } from "../store.js";
import { getLedger } from "../ledger/index.js";
import { getInvoice } from "./invoiceService.js";
import type { Loan, PathPaymentQuote } from "../types.js";

/**
 * Financing service: draw an advance against an invoice, close the loan on customer payment.
 * Author: Can Sarıhan
 */

/** Instant advance against an accepted invoice. */
export async function drawAdvance(invoiceId: string): Promise<Loan> {
  const invoice = getInvoice(invoiceId);
  if (invoice.status !== "Accepted") throw new Error("InvoiceNotAccepted");
  if (invoice.onchainId === null) throw new Error("NotMinted");
  if (store.loans.get(invoiceId)) throw new Error("LoanExists");

  const { advance, txHash } = await getLedger().borrow(
    invoice.onchainId,
    invoice.amount,
  );

  store.invoices.update(invoiceId, { status: "Financed" });
  return store.loans.save({
    invoiceId,
    borrower: invoice.issuerAddress,
    principal: advance,
    faceValue: invoice.amount,
    status: "Active",
    txHash,
  });
}

/**
 * Produce a multi-currency path-payment quote for the customer payment.
 * (The customer pays in their own asset; it is converted to the settlement asset via the DEX.)
 */
export async function quotePayment(
  invoiceId: string,
  sourceAsset: string,
  payerAddress: string,
): Promise<PathPaymentQuote> {
  const invoice = getInvoice(invoiceId);
  return getLedger().buildPathPayment({
    sourceAsset,
    destAsset: invoice.asset,
    destAmount: invoice.amount,
    sourceAddress: payerAddress,
    destAddress: invoice.issuerAddress,
  });
}

/** The customer pays the invoice; any existing loan is closed atomically. */
export async function settlePayment(invoiceId: string): Promise<Loan | null> {
  const invoice = getInvoice(invoiceId);
  if (invoice.onchainId === null) throw new Error("NotMinted");

  const loan = store.loans.get(invoiceId);
  if (loan && loan.status === "Active") {
    const { txHash } = await getLedger().repay(
      invoice.onchainId,
      invoice.amount,
    );
    store.invoices.update(invoiceId, { status: "Paid" });
    return store.loans.update(invoiceId, { status: "Repaid", txHash });
  }

  // No financing means a plain payment: mark the invoice Paid.
  store.invoices.update(invoiceId, { status: "Paid" });
  return null;
}
