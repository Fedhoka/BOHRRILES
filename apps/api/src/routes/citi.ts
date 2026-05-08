import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { requireAuth, requireClient, requireWriteAccess } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { badRequest } from "../lib/errors.js";
import { importCitiCsv } from "../services/citiImport.js";
import { ensureVatPeriodOpen } from "../lib/periodLock.js";

const r = Router();

// Memoria, máx 10MB. Sólo para validar tipo y parsear; nunca persistir el archivo crudo.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

r.use(requireAuth, requireClient);

/** POST /citi/sales/preview — valida y devuelve filas, sin persistir. */
r.post("/sales/preview", requireWriteAccess, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest("file_required");
    await assertCsvBuffer(req.file.buffer);
    const out = importCitiCsv(req.file.buffer.toString("utf8"));
    res.json(out);
  } catch (e) { next(e); }
});

/** POST /citi/sales/commit — confirma e inserta filas válidas. */
r.post("/sales/commit", requireWriteAccess, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest("file_required");
    await assertCsvBuffer(req.file.buffer);
    const out = importCitiCsv(req.file.buffer.toString("utf8"));
    const inserted: string[] = [];
    for (const row of out.rows) {
      await ensureVatPeriodOpen(req.auth!.clientId!, row.period);
      const [r2] = await db
        .insert(schema.salesInvoices)
        .values({
          clientId: req.auth!.clientId!,
          period: row.period,
          issueDate: row.issueDate,
          invoiceType: row.invoiceType,
          pointOfSale: row.pointOfSale,
          number: row.number,
          buyerCuit: row.cuit,
          buyerName: row.name,
          netAmount: row.netAmount,
          vat21: row.vat21,
          vat105: row.vat105,
          vat27: row.vat27,
          total: row.total,
        })
        .onConflictDoNothing()
        .returning({ id: schema.salesInvoices.id });
      if (r2) inserted.push(r2.id);
    }
    await audit(req, { action: "import_citi_sales", entity: "sales_invoice", meta: { count: inserted.length } });
    res.json({ inserted: inserted.length, rejected: out.errors.length, errors: out.errors });
  } catch (e) { next(e); }
});

/** POST /citi/purchases/preview */
r.post("/purchases/preview", requireWriteAccess, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest("file_required");
    await assertCsvBuffer(req.file.buffer);
    const out = importCitiCsv(req.file.buffer.toString("utf8"));
    res.json(out);
  } catch (e) { next(e); }
});

/** POST /citi/purchases/commit */
r.post("/purchases/commit", requireWriteAccess, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest("file_required");
    await assertCsvBuffer(req.file.buffer);
    const out = importCitiCsv(req.file.buffer.toString("utf8"));
    const inserted: string[] = [];
    for (const row of out.rows) {
      await ensureVatPeriodOpen(req.auth!.clientId!, row.period);
      const grantsCredit = row.invoiceType === "A" || row.invoiceType === "M";
      const [r2] = await db
        .insert(schema.purchaseInvoices)
        .values({
          clientId: req.auth!.clientId!,
          period: row.period,
          issueDate: row.issueDate,
          invoiceType: row.invoiceType,
          pointOfSale: row.pointOfSale,
          number: row.number,
          supplierCuit: row.cuit,
          supplierName: row.name,
          netAmount: row.netAmount,
          vat21: row.vat21,
          vat105: row.vat105,
          vat27: row.vat27,
          total: row.total,
          isPayroll: false,
          grantsCredit,
        })
        .onConflictDoNothing()
        .returning({ id: schema.purchaseInvoices.id });
      if (r2) inserted.push(r2.id);
    }
    await audit(req, { action: "import_citi_purchases", entity: "purchase_invoice", meta: { count: inserted.length } });
    res.json({ inserted: inserted.length, rejected: out.errors.length, errors: out.errors });
  } catch (e) { next(e); }
});

/**
 * Valida que el buffer parezca un CSV de texto. Aplica magic-bytes para descartar
 * binarios disfrazados (xlsx/zip/exe) y sólo acepta texto plano.
 */
async function assertCsvBuffer(buf: Buffer) {
  const ft = await fileTypeFromBuffer(buf);
  // file-type devuelve undefined para texto plano (CSV) — eso es lo esperado.
  if (ft && !["txt", "csv"].includes(ft.ext)) {
    throw badRequest(`invalid_file_type:${ft.ext}`);
  }
  // Heurística: ningún byte NUL, todo ASCII/UTF8 imprimible (al menos al inicio).
  const head = buf.subarray(0, Math.min(buf.length, 4096));
  for (let i = 0; i < head.length; i++) {
    if (head[i] === 0) throw badRequest("binary_not_allowed");
  }
}

export default r;
