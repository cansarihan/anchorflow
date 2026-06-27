import { store } from "../store.js";
import { getLedger } from "../ledger/index.js";
import { getInvoice } from "./invoiceService.js";
import type { Loan, PathPaymentQuote } from "../types.js";

/**
 * Financing servisi: faturaya karşı avans çek, müşteri ödemesiyle krediyi kapat.
 * Author: Can Sarıhan
 */

/** Kabul edilmiş faturaya karşı anında avans. */
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
 * Müşteri ödemesi için çok-para-birimli path-payment teklifi üret.
 * (Müşteri kendi varlığında öder; DEX üzerinden settlement varlığına çevrilir.)
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

/** Müşteri faturayı öder; varsa kredi atomik kapanır. */
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

  // Financing yoksa düz ödeme: faturayı Paid yap.
  store.invoices.update(invoiceId, { status: "Paid" });
  return null;
}
