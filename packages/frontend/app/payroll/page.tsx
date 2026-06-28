"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type Stream } from "../lib/api";
import { getAccount, isValidAddress } from "../lib/wallet";

/**
 * Programlanabilir maaş akışı paneli. İşveren akış oluşturur, çalışan zamanla
 * hak eder ve istediği an çeker. Author: Can Sarıhan
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
      /* yoksay */
    }
  }, []);

  // Akış aktifken canlı vested ilerlemesi için periyodik yenile.
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
      setToast({ kind: "ok", msg: `Akış #${s.id} oluşturuldu (escrow)` });
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
      setToast({ kind: "ok", msg: `${r.amount} USDC çekildi` });
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
        <p className="hint">Maaş akışı için sağ üstten adres bağla.</p>
      </div>
    );
  }

  const pct = stream
    ? Math.min(100, (Number(stream.vested) / Number(stream.total)) * 100)
    : 0;

  return (
    <div>
      <div className="card">
        <h2>Programlanabilir maaş akışı</h2>
        <p className="hint">
          İşveren toplam tutarı kontrata kilitler; çalışan zamanla lineer olarak
          hak eder ve istediği an çeker. Sub-cent ücret bunu ekonomik kılar.
        </p>
        {!stream && (
          <>
            <label>Çalışan adresi</label>
            <input
              placeholder="G…"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
            />
            <div className="row">
              <div>
                <label>Toplam (USDC)</label>
                <input value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
              <div>
                <label>Süre (saniye)</label>
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
              Akış oluştur (escrow)
            </button>
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      {stream && (
        <div className="card">
          <h2>Akış #{stream.id}</h2>
          <div className="stat-grid">
            <div className="stat">
              <div className="k">Toplam</div>
              <div className="v">{stream.total}</div>
            </div>
            <div className="stat">
              <div className="k">Hak edilen</div>
              <div className="v">{Number(stream.vested).toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="k">Çekilebilir</div>
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
            {pct.toFixed(1)}% hak edildi ·{" "}
            <span className={`badge ${stream.status === "Completed" ? "Paid" : "Financed"}`}>
              {stream.status}
            </span>
          </div>

          {stream.status === "Active" && (
            <button className="success" disabled={busy} onClick={withdraw}>
              Hak edileni çek
            </button>
          )}
        </div>
      )}
    </div>
  );
}
