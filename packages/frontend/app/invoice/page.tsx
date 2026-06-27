"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type Invoice } from "../lib/api";
import { getAccount } from "../lib/wallet";

/** Freelancer paneli. Author: Can Sarıhan */
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
        <h2>Cüzdan bağlı değil</h2>
        <p className="hint">
          Devam etmek için sağ üstten bir Stellar adresi bağla (G… ile başlar).
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>Yeni fatura</h2>
        <p className="hint">
          Fatura on-chain tokenize edilir; müşteri kabul edince avansa uygun olur.
        </p>
        <div className="row">
          <div>
            <label>Tutar (USDC)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label>Vade</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <label>Müşteri adresi (opsiyonel)</label>
        <input
          placeholder="G…"
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
        />
        <label>Belge referansı (hash'lenir)</label>
        <input
          placeholder="sözleşme / iş tanımı"
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
              "Fatura oluşturuldu",
            )
          }
        >
          Fatura oluştur
        </button>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      <div className="card">
        <h2>Faturalarım</h2>
        <p className="hint">
          Demo: müşteri kabulünü buradan tetikleyebilir, sonra avans çekebilirsin.
        </p>
        <table>
          <thead>
            <tr>
              <th>Tutar</th>
              <th>Durum</th>
              <th>Ödeme link'i</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Henüz fatura yok.
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
                        action(() => api.accept(inv.id), "Müşteri kabul etti")
                      }
                    >
                      Kabul (demo)
                    </button>
                  )}
                  {inv.status === "Accepted" && (
                    <button
                      className="success"
                      style={{ marginTop: 0 }}
                      disabled={busy}
                      onClick={() =>
                        action(() => api.finance(inv.id), "Avans çekildi")
                      }
                    >
                      Avans çek
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
