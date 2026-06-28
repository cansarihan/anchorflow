"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type PathPaymentQuote } from "../../lib/api";
import { getAccount } from "../../lib/wallet";

/** Customer payment page. Author: Can Sarıhan */
export default function PayPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [info, setInfo] = useState<Awaited<
    ReturnType<typeof api.payInfo>
  > | null>(null);
  const [sourceAsset, setSourceAsset] = useState("EURC");
  const [payer, setPayer] = useState("");
  const [quote, setQuote] = useState<PathPaymentQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null,
  );

  async function load() {
    try {
      setInfo(await api.payInfo(id));
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    }
  }

  useEffect(() => {
    load();
    setPayer(getAccount() ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function getQuote() {
    setBusy(true);
    setToast(null);
    try {
      const issuer = info?.payTo ?? "";
      const asset = sourceAsset === "XLM" ? "native" : `${sourceAsset}:${issuer}`;
      setQuote(await api.quote(id, asset, payer || issuer));
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    setToast(null);
    try {
      const r = await api.settle(id);
      setToast({
        kind: "ok",
        msg: r.loan
          ? "Payment received — loan repaid automatically ✓"
          : "Payment received ✓",
      });
      await load();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!info) {
    return (
      <div className="card">
        <h2>Loading invoice…</h2>
        {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
      </div>
    );
  }

  const paid = info.status === "Paid";

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2>Payment</h2>
      <p className="hint">Secure, instant settlement through AnchorFlow.</p>

      <div className="stat" style={{ marginBottom: 18 }}>
        <div className="k">Amount due</div>
        <div className="v">
          {info.amount} {info.asset}
        </div>
        <div className="muted mono" style={{ marginTop: 6 }}>
          → {info.payTo.slice(0, 8)}…{info.payTo.slice(-6)}
        </div>
        <div style={{ marginTop: 8 }}>
          <span className={`badge ${info.status}`}>{info.status}</span>
        </div>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      {!paid && (
        <>
          <div className="row">
            <div>
              <label>Your payment currency</label>
              <select
                value={sourceAsset}
                onChange={(e) => setSourceAsset(e.target.value)}
              >
                <option value="EURC">EURC</option>
                <option value="USDC">USDC</option>
                <option value="XLM">XLM</option>
              </select>
            </div>
            <div>
              <label>Your address</label>
              <input
                placeholder="G…"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              />
            </div>
          </div>

          <button className="ghost" disabled={busy} onClick={getQuote}>
            Get rate quote
          </button>

          {quote && (
            <div className="stat" style={{ marginTop: 14 }}>
              <div className="k">To send (path-payment)</div>
              <div className="v">
                {quote.sendAmount} {sourceAsset}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                → {quote.estimatedDestAmount} {info.asset} (FX via DEX)
              </div>
            </div>
          )}

          <button className="success" disabled={busy} onClick={pay}>
            Pay {info.amount} {info.asset}
          </button>
        </>
      )}

      {paid && (
        <div className="toast ok">This invoice has been paid. Thank you!</div>
      )}
    </div>
  );
}
