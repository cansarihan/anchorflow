import type { LedgerAdapter, MintInvoiceParams } from "./types.js";
import type { PathPaymentQuote, PoolStats } from "../types.js";
import { config } from "../config.js";
import { applyBps, fromStroops, toStroops } from "../money.js";

/**
 * SimLedger — LendingPool/InvoiceToken kontrat mantığının yerel aynası.
 * Canlı ağ olmadan tüm financing akışını gösterir; matematik kontratla aynıdır.
 * Author: Can Sarıhan
 */
export class SimLedger implements LedgerAdapter {
  readonly mode = "sim" as const;

  private counter = 0;
  private liquidity = toStroops("100000"); // demo için tohum likidite: 100k USDC
  private borrowed = 0n;
  private loans = new Map<number, { principal: bigint; faceValue: bigint }>();

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
    // anapara serbest, fee havuzda kalır -> LP yield
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
    // Sim modunda FX'i 1:1 + %0.1 temsili spread ile modelle.
    const dest = toStroops(params.destAmount);
    const send = dest + applyBps(dest, 10); // ~%0.1
    return {
      sourceAsset: params.sourceAsset,
      destAsset: params.destAsset,
      sendAmount: fromStroops(send),
      estimatedDestAmount: params.destAmount,
      xdr: null,
    };
  }
}
