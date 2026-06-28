"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type Invoice } from "../lib/api";
import { getAccount } from "../lib/wallet";

/** Freelancer dashboard. Author: Can Sarıhan */
export default function InvoicePage() {
  const [account, setAccount] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [amount, setAmount] = useState("1000");
  const [payer, setPayer] = useState("");
  const [dueDate, setDueDate] = useState("2026-08-28");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null,
  );

  const refresh = useCallback(async (acc: string | null) => {
    if (!acc) return;
    try {
      setInvoices(await api.listInvoices(acc));
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    const acc = getAccount();
    setAccount(acc);
    refresh(acc);
    const onChange = () => {
      const a = getAccount();
      setAccount(a);
      refresh(a);
    };
    window.addEventListener("anchorflow:account", onChange);
    return () => window.removeEventListener("anchorflow:account", onChange);
  }, [refresh]);

  async function action<T>(fn: () => Promise<T>, ok: string) {
    setBusy(true);
    setToast(null);
    try {
      await fn();
      setToast({ kind: "ok", msg: ok });
      await refresh(account);
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <div className="card">
        <h2>Wallet not connected</h2>
        <p className="hint">
          To continue, connect a Stellar address from the top right (starts with G…).
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>New invoice</h2>
        <p className="hint">
          The invoice is tokenized on-chain; once the customer accepts it, it becomes eligible for an advance.
        </p>
        <div className="row">
          <div>
            <label>Amount (USDC)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label>Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <label>Customer address (optional)</label>
        <input
          placeholder="G…"
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
        />
        <label>Document reference (hashed)</label>
        <input
          placeholder="contract / statement of work"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
        />
        <button
          disabled={busy}
          onClick={() =>
            action(
              () =>
                api.createInvoice({
                  issuerAddress: account,
                  payerAddress: payer || undefined,
                  amount,
                  dueDate,
                  documentRef: ref || undefined,
                }),
              "Invoice created",
            )
          }
        >
          Create invoice
        </button>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      <div className="card">
        <h2>My invoices</h2>
        <p className="hint">
          Demo: you can trigger the customer acceptance here, then draw an advance.
        </p>
        <table>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment link</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No invoices yet.
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  {inv.amount} {inv.asset}
                </td>
                <td>
                  <span className={`badge ${inv.status}`}>{inv.status}</span>
                </td>
                <td>
                  <a href={`/pay/${inv.id}`} target="_blank" rel="noreferrer">
                    /pay/{inv.id.slice(0, 8)}
                  </a>
                </td>
                <td style={{ textAlign: "right" }}>
                  {inv.status === "Pending" && (
                    <button
                      className="ghost"
                      style={{ marginTop: 0 }}
                      disabled={busy}
                      onClick={() =>
                        action(() => api.accept(inv.id), "Customer accepted")
                      }
                    >
                      Accept (demo)
                    </button>
                  )}
                  {inv.status === "Accepted" && (
                    <button
                      className="success"
                      style={{ marginTop: 0 }}
                      disabled={busy}
                      onClick={() =>
                        action(() => api.finance(inv.id), "Advance drawn")
                      }
                    >
                      Draw advance
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
