import type { LedgerAdapter, MintInvoiceParams } from "./types.js";
import type { PathPaymentQuote, PoolStats, StreamView } from "../types.js";
import { config } from "../config.js";
import { applyBps, fromStroops, toStroops } from "../money.js";

interface SimStream {
  id: number;
  employer: string;
  employee: string;
  total: bigint;
  withdrawn: bigint;
  startMs: number;
  endMs: number;
  status: "Active" | "Cancelled" | "Completed";
}

/**
 * SimLedger — a local mirror of the LendingPool/InvoiceToken contract logic.
 * Demonstrates the entire financing flow without a live network; the math matches the contract.
 * Author: Can Sarıhan
 */
export class SimLedger implements LedgerAdapter {
  readonly mode = "sim" as const;

  private counter = 0;
  private liquidity = toStroops("100000"); // seed liquidity for the demo: 100k USDC
  private borrowed = 0n;
  private loans = new Map<number, { principal: bigint; faceValue: bigint }>();
  private streamCounter = 0;
  private streams = new Map<number, SimStream>();

  async mintInvoice(_params: MintInvoiceParams) {
    this.counter += 1;
    return { onchainId: this.counter, txHash: null };
  }

  async acceptInvoice(_onchainId: number) {
    return { txHash: null };
  }

  async borrow(onchainId: number, amount: string) {
    const face = toStroops(amount);
    const principal = applyBps(face, config.pool.advanceBps);
    if (principal > this.liquidity - this.borrowed) {
      throw new Error("InsufficientLiquidity");
    }
    this.borrowed += principal;
    this.loans.set(onchainId, { principal, faceValue: face });
    return { advance: fromStroops(principal), txHash: null };
  }

  async repay(onchainId: number, _faceValue: string) {
    const loan = this.loans.get(onchainId);
    if (!loan) throw new Error("LoanNotFound");
    const fee = applyBps(loan.faceValue, config.pool.feeBps);
    // principal is freed, the fee stays in the pool -> LP yield
    this.borrowed -= loan.principal;
    this.liquidity += fee;
    this.loans.delete(onchainId);
    return { txHash: null };
  }

  async deposit(_lpAddress: string, amount: string) {
    const a = toStroops(amount);
    this.liquidity += a;
    return { shares: fromStroops(a), txHash: null };
  }

  async poolStats(): Promise<PoolStats> {
    const util =
      this.liquidity > 0n
        ? Number((this.borrowed * 10_000n) / this.liquidity)
        : 0;
    return {
      liquidity: fromStroops(this.liquidity),
      borrowed: fromStroops(this.borrowed),
      utilizationBps: util,
    };
  }

  async buildPathPayment(params: {
    sourceAsset: string;
    destAsset: string;
    destAmount: string;
  }): Promise<PathPaymentQuote> {
    // In sim mode, model FX as 1:1 plus a representative 0.1% spread.
    const dest = toStroops(params.destAmount);
    const send = dest + applyBps(dest, 10); // ~0.1%
    return {
      sourceAsset: params.sourceAsset,
      destAsset: params.destAsset,
      sendAmount: fromStroops(send),
      estimatedDestAmount: params.destAmount,
      xdr: null,
    };
  }

  async createStream(params: {
    employer: string;
    employee: string;
    total: string;
    durationSeconds: number;
  }) {
    this.streamCounter += 1;
    const now = Date.now();
    this.streams.set(this.streamCounter, {
      id: this.streamCounter,
      employer: params.employer,
      employee: params.employee,
      total: toStroops(params.total),
      withdrawn: 0n,
      startMs: now,
      endMs: now + params.durationSeconds * 1000,
      status: "Active",
    });
    return { streamId: this.streamCounter, txHash: null };
  }

  async getStream(streamId: number): Promise<StreamView> {
    const s = this.requireStream(streamId);
    const vested = this.vested(s);
    return {
      id: s.id,
      employer: s.employer,
      employee: s.employee,
      total: fromStroops(s.total),
      withdrawn: fromStroops(s.withdrawn),
      vested: fromStroops(vested),
      withdrawable: fromStroops(vested - s.withdrawn),
      status: s.status,
      startAt: new Date(s.startMs).toISOString(),
      endAt: new Date(s.endMs).toISOString(),
      txHash: null,
    };
  }

  async withdrawStream(streamId: number) {
    const s = this.requireStream(streamId);
    if (s.status !== "Active") throw new Error("NotActive");
    const amount = this.vested(s) - s.withdrawn;
    if (amount <= 0n) throw new Error("NothingToWithdraw");
    s.withdrawn += amount;
    if (s.withdrawn >= s.total) s.status = "Completed";
    return { amount: fromStroops(amount), txHash: null };
  }

  private vested(s: SimStream): bigint {
    const now = Date.now();
    if (now <= s.startMs) return 0n;
    if (now >= s.endMs) return s.total;
    const elapsed = BigInt(now - s.startMs);
    const span = BigInt(s.endMs - s.startMs);
    return (s.total * elapsed) / span;
  }

  private requireStream(id: number): SimStream {
    const s = this.streams.get(id);
    if (!s) throw new Error("StreamNotFound");
    return s;
  }
}
