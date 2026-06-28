import type { Invoice, Loan } from "./types.js";

/**
 * In-memory data store for the MVP. Thanks to the repository pattern, a later
 * migration to PostgreSQL can be done without changing the interface.
 * Author: Can Sarıhan
 */

class InvoiceRepo {
  private byId = new Map<string, Invoice>();

  save(invoice: Invoice): Invoice {
    this.byId.set(invoice.id, invoice);
    return invoice;
  }

  get(id: string): Invoice | undefined {
    return this.byId.get(id);
  }

  update(id: string, patch: Partial<Invoice>): Invoice {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`Invoice not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.byId.set(id, updated);
    return updated;
  }

  listByIssuer(issuer: string): Invoice[] {
    return [...this.byId.values()].filter((i) => i.issuerAddress === issuer);
  }

  all(): Invoice[] {
    return [...this.byId.values()];
  }
}

class LoanRepo {
  private byInvoice = new Map<string, Loan>();

  save(loan: Loan): Loan {
    this.byInvoice.set(loan.invoiceId, loan);
    return loan;
  }

  get(invoiceId: string): Loan | undefined {
    return this.byInvoice.get(invoiceId);
  }

  update(invoiceId: string, patch: Partial<Loan>): Loan {
    const existing = this.byInvoice.get(invoiceId);
    if (!existing) throw new Error(`Loan not found: ${invoiceId}`);
    const updated = { ...existing, ...patch };
    this.byInvoice.set(invoiceId, updated);
    return updated;
  }
}

export const store = {
  invoices: new InvoiceRepo(),
  loans: new LoanRepo(),
};
