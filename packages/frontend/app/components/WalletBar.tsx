"use client";

import { useEffect, useState } from "react";
import {
  getAccount,
  setAccount,
  disconnect,
  connectFreighter,
  isValidAddress,
} from "../lib/wallet";

/**
 * Cüzdan bağlama barı. Freighter denenir; yoksa manuel G... adres girişi.
 * Author: Can Sarıhan
 */
export function WalletBar() {
  const [account, setAcc] = useState<string | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    setAcc(getAccount());
    const onChange = () => setAcc(getAccount());
    window.addEventListener("anchorflow:account", onChange);
    return () => window.removeEventListener("anchorflow:account", onChange);
  }, []);

  if (account) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono muted" title={account}>
          {account.slice(0, 5)}…{account.slice(-4)}
        </span>
        <button className="ghost" style={{ marginTop: 0 }} onClick={disconnect}>
          Çıkış
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        placeholder="G… adresi yapıştır"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: 200 }}
      />
      <button
        style={{ marginTop: 0 }}
        disabled={!isValidAddress(input)}
        onClick={() => setAccount(input)}
      >
        Bağlan
      </button>
      <button
        className="ghost"
        style={{ marginTop: 0 }}
        onClick={() => connectFreighter()}
        title="Freighter eklentisi varsa"
      >
        Freighter
      </button>
    </div>
  );
}
