import { randomUUID } from "node:crypto";

/**
 * SEP-24 anchor simulator — represents a local fiat off-ramp/on-ramp bridge.
 * Real anchor integration is Milestone 2; here the interactive deposit/withdraw
 * process is mimicked so the flow can be shown end to end. Author: Can Sarıhan
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

/** Start the SEP-24 interactive flow (deposit = on-ramp, withdraw = off-ramp). */
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

/** The bank/mobile-money side is done — off-ramp/on-ramp completed. */
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
