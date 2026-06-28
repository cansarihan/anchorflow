import { getLedger } from "../ledger/index.js";
import type { StreamView } from "../types.js";

/**
 * Payroll stream service — a thin layer over the PayrollStream contract.
 * Author: Can Sarıhan
 */

export async function createStream(input: {
  employer: string;
  employee: string;
  total: string;
  durationSeconds: number;
}): Promise<StreamView> {
  const { streamId } = await getLedger().createStream(input);
  return getLedger().getStream(streamId);
}

export function getStream(streamId: number): Promise<StreamView> {
  return getLedger().getStream(streamId);
}

export async function withdrawStream(
  streamId: number,
): Promise<{ amount: string; stream: StreamView }> {
  const { amount } = await getLedger().withdrawStream(streamId);
  return { amount, stream: await getLedger().getStream(streamId) };
}
