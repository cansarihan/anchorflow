import { randomUUID } from "node:crypto";

/**
 * SEP-24 anchor simülatörü — yerel fiat off-ramp/on-ramp köprüsünü temsil eder.
 * Gerçek anchor entegrasyonu Milestone 2; burada akış uçtan uca gösterilebilsin
 * diye interaktif deposit/withdraw süreci taklit edilir. Author: Can Sarıhan
 */

export type AnchorTxKind = "deposit" | "withdraw";
export type AnchorTxStatus =
  | "incomplete"
  | "pending_user_transfer_start"
  | "pending_anchor"
  | "completed";

export interface AnchorTransaction {
  id: string;
  kind: AnchorTxKind;
  asset: string;
  amount: string;
  account: string;
  status: AnchorTxStatus;
  interactiveUrl: string;
  createdAt: string;
}

const txs = new Map<string, AnchorTransaction>();

/** SEP-24 interaktif akış başlat (deposit = on-ramp, withdraw = off-ramp). */
export function startInteractive(params: {
  kind: AnchorTxKind;
  asset: string;
  amount: string;
  account: string;
}): AnchorTransaction {
  const id = randomUUID();
  const tx: AnchorTransaction = {
    id,
    kind: params.kind,
    asset: params.asset,
    amount: params.amount,
    account: params.account,
    status: "pending_user_transfer_start",
    interactiveUrl: `/anchor/interactive/${id}`,
    createdAt: new Date().toISOString(),
  };
  txs.set(id, tx);
  return tx;
}

/** Banka/mobil para tarafı tamamlandı — off-ramp/on-ramp biti. */
export function completeInteractive(id: string): AnchorTransaction {
  const tx = txs.get(id);
  if (!tx) throw new Error("AnchorTxNotFound");
  tx.status = "completed";
  txs.set(id, tx);
  return tx;
}

export function getAnchorTx(id: string): AnchorTransaction {
  const tx = txs.get(id);
  if (!tx) throw new Error("AnchorTxNotFound");
  return tx;
}
