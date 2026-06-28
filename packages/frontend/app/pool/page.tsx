"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type PoolStats } from "../lib/api";
import { getAccount } from "../lib/wallet";

/** Liquidity provider dashboard. Author: Can Sarıhan */
export default function PoolPage() {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [amount, setAmount] = useState("10000");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    try {
      setStats(await api.poolStats());
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    setAccount(getAccount());
    refresh();
    const onChange = () => setAccount(getAccount());
    window.addEventListener("anchorflow:account", onChange);
    return () => window.removeEventListener("anchorflow:account", onChange);
  }, [refresh]);

  async function deposit() {
    if (!account) return;
    setBusy(true);
    setToast(null);
    try {
      await api.deposit(account, amount);
      setToast({ kind: "ok", msg: `${amount} USDC deposited` });
      await refresh();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const util = stats ? (stats.utilizationBps / 100).toFixed(1) : "0";

  return (
    <div>
      <div className="card">
        <h2>Liquidity pool</h2>
        <p className="hint">
          The pool advances funds against verified invoices. Its yield is not
          speculation — it comes from real invoice cash flow.
        </p>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Total liquidity</div>
            <div className="v">{stats?.liquidity ?? "—"}</div>
          </div>
          <div className="stat">
            <div className="k">In loans</div>
            <div className="v">{stats?.borrowed ?? "—"}</div>
          </div>
          <div className="stat">
            <div className="k">Utilization</div>
            <div className="v">{util}%</div>
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      <div className="card">
        <h2>Provide liquidity</h2>
        {!account ? (
          <p className="hint">First connect your wallet from the top right.</p>
        ) : (
          <>
            <label>Amount (USDC)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className="success" disabled={busy} onClick={deposit}>
              Deposit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
