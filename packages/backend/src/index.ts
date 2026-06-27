import express, { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";

import { config } from "./config.js";
import { router } from "./routes.js";
import { getLedger } from "./ledger/index.js";

/**
 * AnchorFlow backend giriş noktası. Author: Can Sarıhan
 */

const app = express();
app.use(express.json());
app.use("/", router);

// Hata middleware'i
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "ValidationError", details: err.issues });
    return;
  }
  const message = err instanceof Error ? err.message : "InternalError";
  const status = clientErrors.has(message) ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: message });
});

// İş kuralı ihlalleri -> 400
const clientErrors = new Set([
  "InvoiceNotFound",
  "InvalidStatus",
  "InvoiceNotAccepted",
  "LoanExists",
  "LoanNotFound",
  "NotMinted",
  "InsufficientLiquidity",
  "AnchorTxNotFound",
]);

export function start() {
  getLedger(); // mod logla
  app.listen(config.port, () => {
    console.log(`[anchorflow] backend http://localhost:${config.port}`);
  });
}

// Doğrudan çalıştırıldıysa başlat.
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { app };
