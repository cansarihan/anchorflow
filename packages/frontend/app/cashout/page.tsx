"use client";

import { useEffect, useState } from "react";
import { api, type AnchorTransaction } from "../lib/api";
import { getAccount } from "../lib/wallet";

/**
 * Yerel nakde çevirme (anchor off-ramp, SEP-24). Freelancer USDC'sini
 * yerel banka/mobil paraya çeker. Author: Can Sarıhan
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
      setToast({ kind: "ok", msg: "Yerel hesabına ödeme tamamlandı ✓" });
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
        <p className="hint">Nakde çevirmek için sağ üstten adres bağla.</p>
      </div>
    );
  }

  const done = tx?.status === "completed";

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2>Yerel nakde çevir</h2>
      <p className="hint">
        Stellar anchor (SEP-24) ile USDC'ni yerel banka veya mobil paraya çek —
        bankaların görmezden geldiği bölgelerde bile.
      </p>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}

      {!tx && (
        <>
          <div className="row">
            <div>
              <label>Tutar</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label>Varlık</label>
              <select value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="USDC">USDC</option>
                <option value="EURC">EURC</option>
              </select>
            </div>
          </div>
          <button className="success" disabled={busy} onClick={start}>
            Off-ramp başlat
          </button>
        </>
      )}

      {tx && (
        <div className="stat" style={{ marginTop: 8 }}>
          <div className="k">Off-ramp talebi</div>
          <div className="v">
            {tx.amount} {tx.asset}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${done ? "Paid" : "Financed"}`}>
              {done ? "Tamamlandı" : "Banka transferi bekleniyor"}
            </span>
          </div>
          {!done && (
            <button
              className="success"
              disabled={busy}
              onClick={complete}
              style={{ marginTop: 14 }}
            >
              Bankaya gönderildi (anchor'ı tamamla)
            </button>
          )}
          {done && (
            <div className="muted" style={{ marginTop: 12 }}>
              {tx.amount} {tx.asset} → yerel hesabın. İşlem ref: {tx.id.slice(0, 8)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
