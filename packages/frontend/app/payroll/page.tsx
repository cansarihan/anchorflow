"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type Stream } from "../lib/api";
import { getAccount, isValidAddress } from "../lib/wallet";

/**
 * Programmable payroll stream dashboard. The employer creates a stream, and the
 * employee vests over time and withdraws whenever they want. Author: Can Sarıhan
 */
export default function PayrollPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [employee, setEmployee] = useState("");
  const [total, setTotal] = useState("1000");
  const [duration, setDuration] = useState("60");
  const [stream, setStream] = useState<Stream | null>(null);
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

  const refresh = useCallback(async (id: number) => {
    try {
      setStream(await api.getStream(id));
    } catch {
      /* ignore */
    }
  }, []);

  // Periodically refresh for live vested progress while the stream is active.
  useEffect(() => {
    if (!stream || stream.status !== "Active") return;
    const t = setInterval(() => refresh(stream.id), 2000);
    return () => clearInterval(t);
  }, [stream, refresh]);

  async function create() {
    if (!account) return;
    setBusy(true);
    setToast(null);
    try {
      const s = await api.createStream({
        employer: account,
        employee,
        total,
        durationSeconds: Number(duration),
      });
      setStream(s);
      setToast({ kind: "ok", msg: `Stream #${s.id} created (escrow)` });
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!stream) return;
    setBusy(true);
    setToast(null);
    try {
      const r = await api.withdrawStream(stream.id);
      setStream(r.stream);
      setToast({ kind: "ok", msg: `${r.amount} USDC withdrawn` });
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
        <p className="hint">Connect an address from the top right for payroll.</p>
      </div>
    );
  }

  const pct = stream
    ? Math.min(100, (Number(stream.vested) / Number(stream.total)) * 100)
    : 0;

  return (
    <div>
      <div className="card">
        <h2>Programmable payroll stream</h2>
        <p className="hint">
          The employer locks the total amount in the contract; the employee vests
          linearly over time and withdraws whenever they want. Sub-cent fees make
          this economical.
        </p>
        {!stream && (
          <>
            <label>Employee address</label>
            <input
              placeholder="G…"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
            />
            <div className="row">
              <div>
                <label>Total (USDC)</label>
                <input value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
              <div>
                <label>Duration (seconds)</label>
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
            <button
              className="success"
              disabled={busy || !isValidAddress(employee)}
              onClick={create}
            >
              Create stream (escrow)
            </button>
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      {stream && (
        <div className="card">
          <h2>Stream #{stream.id}</h2>
          <div className="stat-grid">
            <div className="stat">
              <div className="k">Total</div>
              <div className="v">{stream.total}</div>
            </div>
            <div className="stat">
              <div className="k">Vested</div>
              <div className="v">{Number(stream.vested).toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="k">Withdrawable</div>
              <div className="v">{Number(stream.withdrawable).toFixed(2)}</div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              height: 10,
              background: "var(--panel-2)",
              borderRadius: 999,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "var(--accent-2)",
                transition: "width 0.5s",
              }}
            />
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            {pct.toFixed(1)}% vested ·{" "}
            <span className={`badge ${stream.status === "Completed" ? "Paid" : "Financed"}`}>
              {stream.status}
            </span>
          </div>

          {stream.status === "Active" && (
            <button className="success" disabled={busy} onClick={withdraw}>
              Withdraw vested
            </button>
          )}
        </div>
      )}
    </div>
  );
}
