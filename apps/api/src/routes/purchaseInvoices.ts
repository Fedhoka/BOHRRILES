import { Router } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireClient, requireWriteAccess } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";
import { ensureVatPeriodOpen } from "../lib/periodLock.js";
import { validateCUIT } from "@bohr/core";

const r = Router();

const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

const Body = z.object({
  period: z.string().regex(periodRe),
  issueDate: z.coerce.date(),
  invoiceType: z.enum(["A", "B", "C", "M", "E"]),
  pointOfSale: z.number().int().min(1).max(99999),
  number: z.number().int().min(1).max(99999999),
  supplierCuit: z.string().refine(validateCUIT, "invalid_cuit"),
  supplierName: z.string().min(1).max(200),
  netAmount: z.number().nonnegative(),
  vat21: z.number().nonnegative().default(0),
  vat105: z.number().nonnegative().default(0),
  vat27: z.number().nonnegative().default(0),
  vatPerceptions: z.number().nonnegative().default(0),
  iibbPerceptions: z.number().nonnegative().default(0),
  exempt: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  isPayroll: z.boolean().default(false),
}).transform((v) => ({
  ...v,
  // Crítico: A y M habilitan crédito; pero si es sueldo, NO genera crédito.
  grantsCredit: (v.invoiceType === "A" || v.invoiceType === "M") && !v.isPayroll,
}));

r.use(requireAuth, requireClient);

r.get("/", async (req, res, next) => {
  try {
    const Q = z.object({ period: z.string().regex(periodRe).optional() }).parse(req.query);
    const conds = [eq(schema.purchaseInvoices.clientId, req.auth!.clientId!)];
    if (Q.period) conds.push(eq(schema.purchaseInvoices.period, Q.period));
    const rows = await db
      .select()
      .from(schema.purchaseInvoices)
      .where(and(...conds))
      .orderBy(desc(schema.purchaseInvoices.issueDate));
    res.json(rows);
  } catch (e) { next(e); }
});

r.post("/", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof Body>;
    await ensureVatPeriodOpen(req.auth!.clientId!, body.period);
    const [row] = await db
      .insert(schema.purchaseInvoices)
      .values({ ...body, clientId: req.auth!.clientId! })
      .returning();
    await audit(req, { action: "create", entity: "purchase_invoice", entityId: row!.id });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

r.put("/:id", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const body = req.body as z.infer<typeof Body>;
    await ensureVatPeriodOpen(req.auth!.clientId!, body.period);
    const [row] = await db
      .update(schema.purchaseInvoices)
      .set(body)
      .where(and(eq(schema.purchaseInvoices.id, id), eq(schema.purchaseInvoices.clientId, req.auth!.clientId!)))
      .returning();
    if (!row) throw notFound();
    await audit(req, { action: "update", entity: "purchase_invoice", entityId: id });
    res.json(row);
  } catch (e) { next(e); }
});

r.delete("/:id", requireWriteAccess, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [row] = await db
      .select()
      .from(schema.purchaseInvoices)
      .where(and(eq(schema.purchaseInvoices.id, id), eq(schema.purchaseInvoices.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!row) throw notFound();
    await ensureVatPeriodOpen(req.auth!.clientId!, row.period);
    await db.delete(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.id, id));
    await audit(req, { action: "delete", entity: "purchase_invoice", entityId: id });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
