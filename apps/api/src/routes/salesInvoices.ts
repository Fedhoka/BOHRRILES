import { Router } from "express";
import { z } from "zod";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireClient, requireWriteAccess } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";
import { validateCUIT } from "@bohr/core";

const r = Router();

const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

const Body = z.object({
  period: z.string().regex(periodRe),
  issueDate: z.coerce.date(),
  invoiceType: z.enum(["A", "B", "C", "M", "E"]),
  pointOfSale: z.number().int().min(1).max(99999),
  number: z.number().int().min(1).max(99999999),
  buyerCuit: z.string().refine((v) => v === "" || validateCUIT(v), "invalid_cuit").optional(),
  buyerName: z.string().max(200).optional(),
  netAmount: z.number().nonnegative(),
  vat21: z.number().nonnegative().default(0),
  vat105: z.number().nonnegative().default(0),
  vat27: z.number().nonnegative().default(0),
  vatPerceptions: z.number().nonnegative().default(0),
  iibbPerceptions: z.number().nonnegative().default(0),
  exempt: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
});

r.use(requireAuth, requireClient);

r.get("/", async (req, res, next) => {
  try {
    const Q = z.object({ period: z.string().regex(periodRe).optional() }).parse(req.query);
    const conds = [eq(schema.salesInvoices.clientId, req.auth!.clientId!)];
    if (Q.period) conds.push(eq(schema.salesInvoices.period, Q.period));
    const rows = await db
      .select()
      .from(schema.salesInvoices)
      .where(and(...conds))
      .orderBy(desc(schema.salesInvoices.issueDate));
    res.json(rows);
  } catch (e) { next(e); }
});

r.post("/", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    await ensurePeriodOpen(req.auth!.clientId!, (req.body as { period: string }).period);
    const [row] = await db
      .insert(schema.salesInvoices)
      .values({ ...(req.body as object), clientId: req.auth!.clientId! })
      .returning();
    await audit(req, { action: "create", entity: "sales_invoice", entityId: row!.id });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

r.put("/:id", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const period = (req.body as { period: string }).period;
    await ensurePeriodOpen(req.auth!.clientId!, period);
    const [row] = await db
      .update(schema.salesInvoices)
      .set(req.body as object)
      .where(and(eq(schema.salesInvoices.id, id), eq(schema.salesInvoices.clientId, req.auth!.clientId!)))
      .returning();
    if (!row) throw notFound();
    await audit(req, { action: "update", entity: "sales_invoice", entityId: id });
    res.json(row);
  } catch (e) { next(e); }
});

r.delete("/:id", requireWriteAccess, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [row] = await db
      .select()
      .from(schema.salesInvoices)
      .where(and(eq(schema.salesInvoices.id, id), eq(schema.salesInvoices.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!row) throw notFound();
    await ensurePeriodOpen(req.auth!.clientId!, row.period);
    await db.delete(schema.salesInvoices).where(eq(schema.salesInvoices.id, id));
    await audit(req, { action: "delete", entity: "sales_invoice", entityId: id });
    res.status(204).end();
  } catch (e) { next(e); }
});

async function ensurePeriodOpen(clientId: string, period: string) {
  const [closed] = await db
    .select({ id: schema.vatReturns.id })
    .from(schema.vatReturns)
    .where(and(eq(schema.vatReturns.clientId, clientId), eq(schema.vatReturns.period, period)))
    .limit(1);
  if (closed) {
    const err = new Error("period_closed") as Error & { status?: number };
    err.status = 409;
    throw err;
  }
}

export default r;
