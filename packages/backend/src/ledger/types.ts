import type { PathPaymentQuote, PoolStats, StreamView } from "../types.js";

/**
 * LedgerAdapter — AnchorFlow'un zincir-üstü operasyonlarının soyutlaması.
 * İki uygulama: SorobanLedger (canlı Stellar/Soroban) ve SimLedger (yerel,
 * kontrat matematiğinin aynası). Author: Can Sarıhan
 */

export interface MintInvoiceParams {
  issuerAddress: string;
  payerAddress: string | null;
  amount: string; // tam birim
  dueLedger: number;
  docHash: string; // hex
}

export interface LedgerAdapter {
  readonly mode: "live" | "sim";

  /** Faturayı InvoiceToken kontratında bas. */
  mintInvoice(params: MintInvoiceParams): Promise<{ onchainId: number; txHash: string | null }>;

  /** Müşteri kabulü — financing ön koşulu. */
  acceptInvoice(onchainId: number): Promise<{ txHash: string | null }>;

  /** Fatura teminatına karşı avans çek. */
  borrow(onchainId: number, amount: string): Promise<{ advance: string; txHash: string | null }>;

  /** Müşteri ödemesi — krediyi atomik kapat. */
  repay(onchainId: number, faceValue: string): Promise<{ txHash: string | null }>;

  /** LP havuza likidite yatırır. */
  deposit(lpAddress: string, amount: string): Promise<{ shares: string; txHash: string | null }>;

  /** Havuz istatistikleri. */
  poolStats(): Promise<PoolStats>;

  /** Çok-para-birimli ödeme için path-payment teklifi/oluşturma. */
  buildPathPayment(params: {
    sourceAsset: string;
    destAsset: string;
    destAmount: string;
    sourceAddress: string;
    destAddress: string;
  }): Promise<PathPaymentQuote>;

  /** Programlanabilir maaş akışı oluştur (escrow). */
  createStream(params: {
    employer: string;
    employee: string;
    total: string;
    durationSeconds: number;
  }): Promise<{ streamId: number; txHash: string | null }>;

  /** Akış durumunu + hak ediş bilgisini oku. */
  getStream(streamId: number): Promise<StreamView>;

  /** Çalışan hak edilen kısmı çeker. */
  withdrawStream(streamId: number): Promise<{ amount: string; txHash: string | null }>;
}
