"use client";

import { useEffect, useState } from "react";
import { api, type AnchorTransaction } from "../lib/api";
import { getAccount } from "../lib/wallet";

/**
 * Local cash out (anchor off-ramp, SEP-24). Withdraws a freelancer's USDC
 * to a local bank/mobile money account. Author: Can Sarıhan
 */
export default function CashoutPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [amount, setAmount] = useState("500");
  const [asset, setAsset] = useState("USDC");
  const [tx, setTx] = useState<AnchorTransaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null,
  );

  useEffect(() => {
    setAccount(getAccount());
    const onChange = () => setAccount(getAccount());
    window.addEventListener("anchorflow:account", onChange);
    return () => window.removeEventListener("anchorflow:account", onChange);
  }, []);

  async function start() {
    if (!account) return;
    setBusy(true);
    setToast(null);
    try {
      setTx(
        await api.anchorStart({
          kind: "withdraw",
          asset,
          amount,
          account,
        }),
      );
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!tx) return;
    setBusy(true);
    setToast(null);
    try {
      const done = await api.anchorComplete(tx.id);
      setTx(done);
      setToast({ kind: "ok", msg: "Payment to your local account completed ✓" });
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
        <p className="hint">Connect an address from the top right to cash out.</p>
      </div>
    );
  }

  const done = tx?.status === "completed";

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2>Local cash out</h2>
      <p className="hint">
        Withdraw your USDC to a local bank or mobile money account via a Stellar
        anchor (SEP-24) — even in regions that banks ignore.
      </p>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      {!tx && (
        <>
          <div className="row">
            <div>
              <label>Amount</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label>Asset</label>
              <select value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="USDC">USDC</option>
                <option value="EURC">EURC</option>
              </select>
            </div>
          </div>
          <button className="success" disabled={busy} onClick={start}>
            Start off-ramp
          </button>
        </>
      )}

      {tx && (
        <div className="stat" style={{ marginTop: 8 }}>
          <div className="k">Off-ramp request</div>
          <div className="v">
            {tx.amount} {tx.asset}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${done ? "Paid" : "Financed"}`}>
              {done ? "Completed" : "Awaiting bank transfer"}
            </span>
          </div>
          {!done && (
            <button
              className="success"
              disabled={busy}
              onClick={complete}
              style={{ marginTop: 14 }}
            >
              Sent to bank (complete the anchor)
            </button>
          )}
          {done && (
            <div className="muted" style={{ marginTop: 12 }}>
              {tx.amount} {tx.asset} → your local account. Transaction ref: {tx.id.slice(0, 8)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
