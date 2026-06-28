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
 * Wallet connection bar. Tries Freighter; otherwise falls back to manual G... address entry.
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
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        placeholder="Paste G… address"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: 200 }}
      />
      <button
        style={{ marginTop: 0 }}
        disabled={!isValidAddress(input)}
        onClick={() => setAccount(input)}
      >
        Connect
      </button>
      <button
        className="ghost"
        style={{ marginTop: 0 }}
        onClick={() => connectFreighter()}
        title="If the Freighter extension is installed"
      >
        Freighter
      </button>
    </div>
  );
}
