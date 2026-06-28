import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

import {
  createInvoice,
  acceptInvoice,
  getInvoice,
  listInvoices,
} from "./services/invoiceService.js";
import {
  drawAdvance,
  quotePayment,
  settlePayment,
} from "./services/financingService.js";
import { getLedger } from "./ledger/index.js";
import {
  createStream,
  getStream,
  withdrawStream,
} from "./services/payrollService.js";
import {
  startInteractive,
  completeInteractive,
  getAnchorTx,
} from "./anchor/sep24.js";

/**
 * AnchorFlow REST API. Author: Can Sarıhan
 */

// async handler -> hataları next'e ilet
const h =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const createInvoiceSchema = z.object({
  issuerAddress: z.string().min(56).max(56),
  payerEmail: z.string().email().optional(),
  payerAddress: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,7})?$/),
  asset: z.string().optional(),
  dueDate: z.string(),
  documentRef: z.string().optional(),
});

const quoteSchema = z.object({
  sourceAsset: z.string(),
  payerAddress: z.string().min(56).max(56),
});

const depositSchema = z.object({
  lpAddress: z.string().min(56).max(56),
  amount: z.string().regex(/^\d+(\.\d{1,7})?$/),
});

const streamSchema = z.object({
  employer: z.string().min(56).max(56),
  employee: z.string().min(56).max(56),
  total: z.string().regex(/^\d+(\.\d{1,7})?$/),
  durationSeconds: z.number().int().positive(),
});

const anchorSchema = z.object({
  kind: z.enum(["deposit", "withdraw"]),
  asset: z.string(),
  amount: z.string(),
  account: z.string(),
});

export const router = Router();

// --- sağlık & mod ---
router.get("/health", (_req, res) => {
  res.json({ ok: true, mode: getLedger().mode });
});

// --- faturalar ---
router.post(
  "/invoices",
  h(async (req, res) => {
    const input = createInvoiceSchema.parse(req.body);
    res.status(201).json(await createInvoice(input));
  }),
);

router.get(
  "/invoices",
  h(async (req, res) => {
    const issuer = req.query.issuer as string | undefined;
    res.json(listInvoices(issuer));
  }),
);

router.get(
  "/invoices/:id",
  h(async (req, res) => {
    res.json(getInvoice(String(req.params.id)));
  }),
);

router.post(
  "/invoices/:id/accept",
  h(async (req, res) => {
    res.json(await acceptInvoice(String(req.params.id)));
  }),
);

// --- financing ---
router.post(
  "/invoices/:id/finance",
  h(async (req, res) => {
    res.status(201).json(await drawAdvance(String(req.params.id)));
  }),
);

// --- ödeme (müşteri tarafı) ---
router.get(
  "/pay/:id",
  h(async (req, res) => {
    // Müşterinin gördüğü ödeme detayları.
    const invoice = getInvoice(String(req.params.id));
    res.json({
      invoiceId: invoice.id,
      amount: invoice.amount,
      asset: invoice.asset,
      payTo: invoice.issuerAddress,
      status: invoice.status,
    });
  }),
);

router.post(
  "/pay/:id/quote",
  h(async (req, res) => {
    const { sourceAsset, payerAddress } = quoteSchema.parse(req.body);
    res.json(await quotePayment(String(req.params.id), sourceAsset, payerAddress));
  }),
);

router.post(
  "/pay/:id/settle",
  h(async (req, res) => {
    const loan = await settlePayment(String(req.params.id));
    res.json({ invoice: getInvoice(String(req.params.id)), loan });
  }),
);

// --- likidite havuzu ---
router.get(
  "/pool/stats",
  h(async (_req, res) => {
    res.json(await getLedger().poolStats());
  }),
);

router.post(
  "/pool/deposit",
  h(async (req, res) => {
    const { lpAddress, amount } = depositSchema.parse(req.body);
    res.status(201).json(await getLedger().deposit(lpAddress, amount));
  }),
);

// --- maaş akışı (payroll streaming) ---
router.post(
  "/streams",
  h(async (req, res) => {
    const input = streamSchema.parse(req.body);
    res.status(201).json(await createStream(input));
  }),
);

router.get(
  "/streams/:id",
  h(async (req, res) => {
    res.json(await getStream(Number(req.params.id)));
  }),
);

router.post(
  "/streams/:id/withdraw",
  h(async (req, res) => {
    res.json(await withdrawStream(Number(String(req.params.id))));
  }),
);

// --- anchor (SEP-24 sim) ---
router.post(
  "/anchor/transactions",
  h(async (req, res) => {
    const input = anchorSchema.parse(req.body);
    res.status(201).json(startInteractive(input));
  }),
);

router.post(
  "/anchor/transactions/:id/complete",
  h(async (req, res) => {
    res.json(completeInteractive(String(req.params.id)));
  }),
);

router.get(
  "/anchor/transactions/:id",
  h(async (req, res) => {
    res.json(getAnchorTx(String(req.params.id)));
  }),
);
