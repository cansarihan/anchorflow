import {
  rpc,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  scValToNative,
  Address,
  Horizon,
  Operation,
  Asset,
  type xdr,
} from "@stellar/stellar-sdk";

import type { LedgerAdapter, MintInvoiceParams } from "./types.js";
import type { PathPaymentQuote, PoolStats, StreamView } from "../types.js";
import { config } from "../config.js";
import { applyBps, fromStroops, toStroops } from "../money.js";

/**
 * SorobanLedger — live Stellar/Soroban calls.
 *
 * Note (MVP): calls that require an issuer/payer signature, such as
 * mint/accept/borrow, are signed client-side (Freighter) in production. Here,
 * for demo purposes, they are assembled + submitted with a single server key;
 * the architecture is ready for client-side signing to be added.
 * Author: Can Sarıhan
 */
export class SorobanLedger implements LedgerAdapter {
  readonly mode = "live" as const;

  private server: rpc.Server;
  private signer: Keypair;

  constructor() {
    this.server = new rpc.Server(config.network.rpcUrl);
    this.signer = Keypair.fromSecret(config.signerSecret);
  }

  private async invoke(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<{ txHash: string; returnValue: unknown }> {
    const account = await this.server.getAccount(this.signer.publicKey());
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.network.passphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(60)
      .build();

    const prepared = await this.server.prepareTransaction(tx);
    prepared.sign(this.signer);

    // Resubmit on transient "TRY_AGAIN_LATER"/"DUPLICATE" states.
    let sent = await this.server.sendTransaction(prepared);
    for (let i = 0; i < 5 && sent.status === "TRY_AGAIN_LATER"; i++) {
      await sleep(2000);
      sent = await this.server.sendTransaction(prepared);
    }
    if (sent.status === "ERROR") {
      throw new Error(`tx submit error: ${JSON.stringify(sent.errorResult)}`);
    }

    // Wait for the result — testnet confirmation can take a few ledgers (~5 s/ledger).
    let result = await this.server.getTransaction(sent.hash);
    for (let i = 0; i < 60 && result.status === "NOT_FOUND"; i++) {
      await sleep(1500);
      result = await this.server.getTransaction(sent.hash);
    }
    if (result.status !== "SUCCESS") {
      throw new Error(`tx ${sent.hash} failed: ${result.status}`);
    }
    return {
      txHash: sent.hash,
      returnValue: result.returnValue
        ? scValToNative(result.returnValue)
        : null,
    };
  }

  private async simulateRead(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<unknown> {
    const account = await this.server.getAccount(this.signer.publicKey());
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.network.passphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`simulation error: ${sim.error}`);
    }
    return sim.result?.retval ? scValToNative(sim.result.retval) : null;
  }

  async mintInvoice(params: MintInvoiceParams) {
    const ret = await this.invoke(config.contracts.invoiceToken, "mint", [
      new Address(params.issuerAddress).toScVal(),
      new Address(
        params.payerAddress ?? params.issuerAddress,
      ).toScVal(),
      nativeToScVal(toStroops(params.amount), { type: "i128" }),
      new Address(config.contracts.asset).toScVal(),
      nativeToScVal(params.dueLedger, { type: "u32" }),
      nativeToScVal(Buffer.from(params.docHash, "hex"), { type: "bytes" }),
    ]);
    return { onchainId: Number(ret.returnValue), txHash: ret.txHash };
  }

  async acceptInvoice(onchainId: number) {
    const ret = await this.invoke(config.contracts.invoiceToken, "accept", [
      nativeToScVal(onchainId, { type: "u64" }),
    ]);
    return { txHash: ret.txHash };
  }

  async borrow(onchainId: number, amount: string) {
    const ret = await this.invoke(config.contracts.lendingPool, "borrow", [
      nativeToScVal(onchainId, { type: "u64" }),
    ]);
    const principal = applyBps(toStroops(amount), config.pool.advanceBps);
    return { advance: fromStroops(principal), txHash: ret.txHash };
  }

  async repay(onchainId: number, _faceValue: string) {
    const ret = await this.invoke(config.contracts.lendingPool, "repay", [
      new Address(this.signer.publicKey()).toScVal(),
      nativeToScVal(onchainId, { type: "u64" }),
    ]);
    return { txHash: ret.txHash };
  }

  async deposit(lpAddress: string, amount: string) {
    const ret = await this.invoke(config.contracts.lendingPool, "deposit", [
      new Address(lpAddress).toScVal(),
      nativeToScVal(toStroops(amount), { type: "i128" }),
    ]);
    return { shares: String(ret.returnValue), txHash: ret.txHash };
  }

  async poolStats(): Promise<PoolStats> {
    const stats = (await this.simulateRead(
      config.contracts.lendingPool,
      "pool_stats",
      [],
    )) as [bigint, bigint, number];
    return {
      liquidity: fromStroops(stats[0]),
      borrowed: fromStroops(stats[1]),
      utilizationBps: Number(stats[2]),
    };
  }

  async buildPathPayment(params: {
    sourceAsset: string;
    destAsset: string;
    destAmount: string;
    sourceAddress: string;
    destAddress: string;
  }): Promise<PathPaymentQuote> {
    // Classic Stellar path payment: multi-currency settlement via the DEX.
    const horizon = new Horizon.Server(config.network.horizonUrl);
    const source = await horizon.loadAccount(params.sourceAddress);
    const sendAsset = parseAsset(params.sourceAsset);
    const destAsset = parseAsset(params.destAsset);

    // Get the best path from Horizon.
    const paths = await horizon
      .strictReceivePaths([sendAsset], destAsset, params.destAmount)
      .call();
    const best = paths.records[0];
    const sendMax = best
      ? (Number(best.source_amount) * 1.01).toFixed(7)
      : params.destAmount;

    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: config.network.passphrase,
    })
      .addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset,
          sendMax,
          destination: params.destAddress,
          destAsset,
          destAmount: params.destAmount,
          path: best ? best.path.map(toAsset) : [],
        }),
      )
      .setTimeout(120)
      .build();

    return {
      sourceAsset: params.sourceAsset,
      destAsset: params.destAsset,
      sendAmount: sendMax,
      estimatedDestAmount: params.destAmount,
      xdr: tx.toXDR(),
    };
  }

  async createStream(params: {
    employer: string;
    employee: string;
    total: string;
    durationSeconds: number;
  }) {
    const latest = await this.server.getLatestLedger();
    const start = latest.sequence + 1;
    const end = start + Math.max(1, Math.ceil(params.durationSeconds / 5));
    const ret = await this.invoke(config.contracts.payrollStream, "create_stream", [
      new Address(params.employer).toScVal(),
      new Address(params.employee).toScVal(),
      new Address(config.contracts.asset).toScVal(),
      nativeToScVal(toStroops(params.total), { type: "i128" }),
      nativeToScVal(start, { type: "u32" }),
      nativeToScVal(end, { type: "u32" }),
    ]);
    return { streamId: Number(ret.returnValue), txHash: ret.txHash };
  }

  async getStream(streamId: number): Promise<StreamView> {
    const id = nativeToScVal(streamId, { type: "u64" });
    const s = (await this.simulateRead(
      config.contracts.payrollStream,
      "get_stream",
      [id],
    )) as Record<string, unknown>;
    const vested = (await this.simulateRead(
      config.contracts.payrollStream,
      "vested",
      [id],
    )) as bigint;
    const withdrawable = (await this.simulateRead(
      config.contracts.payrollStream,
      "withdrawable",
      [id],
    )) as bigint;
    return {
      id: streamId,
      employer: String(s.employer),
      employee: String(s.employee),
      total: fromStroops(s.total as bigint),
      withdrawn: fromStroops(s.withdrawn as bigint),
      vested: fromStroops(vested),
      withdrawable: fromStroops(withdrawable),
      status: String(s.status) as StreamView["status"],
      startAt: null,
      endAt: null,
      txHash: null,
    };
  }

  async withdrawStream(streamId: number) {
    const ret = await this.invoke(config.contracts.payrollStream, "withdraw", [
      nativeToScVal(streamId, { type: "u64" }),
    ]);
    return { amount: fromStroops(ret.returnValue as bigint), txHash: ret.txHash };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** "USDC:GA..." or "native" -> Asset */
function parseAsset(spec: string): Asset {
  if (spec === "native" || spec === "XLM") return Asset.native();
  const [code, issuer] = spec.split(":");
  if (!issuer) throw new Error(`Asset issuer required: ${spec}`);
  return new Asset(code, issuer);
}

function toAsset(p: { asset_type: string; asset_code?: string; asset_issuer?: string }): Asset {
  if (p.asset_type === "native") return Asset.native();
  return new Asset(p.asset_code!, p.asset_issuer!);
}
