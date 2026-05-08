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
  taxType: z.enum(["iva", "ganancias", "iibb", "suss"]),
  certNumber: z.string().min(1).max(100),
  date: z.coerce.date(),
  amount: z.number().nonnegative(),
  agentCuit: z.string().refine(validateCUIT, "invalid_cuit"),
  agentName: z.string().min(1).max(200),
});

r.use(requireAuth, requireClient);

r.get("/", async (req, res, next) => {
  try {
    const Q = z.object({ period: z.string().regex(periodRe).optional() }).parse(req.query);
    const conds = [eq(schema.withholdings.clientId, req.auth!.clientId!)];
    if (Q.period) conds.push(eq(schema.withholdings.period, Q.period));
    const rows = await db.select().from(schema.withholdings).where(and(...conds)).orderBy(desc(schema.withholdings.date));
    res.json(rows);
  } catch (e) { next(e); }
});

r.post("/", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof Body>;
    await ensureVatPeriodOpen(req.auth!.clientId!, body.period);
    const [row] = await db.insert(schema.withholdings).values({ ...body, clientId: req.auth!.clientId! }).returning();
    await audit(req, { action: "create", entity: "withholding", entityId: row!.id });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

r.delete("/:id", requireWriteAccess, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [row] = await db.select().from(schema.withholdings)
      .where(and(eq(schema.withholdings.id, id), eq(schema.withholdings.clientId, req.auth!.clientId!))).limit(1);
    if (!row) throw notFound();
    await ensureVatPeriodOpen(req.auth!.clientId!, row.period);
    await db.delete(schema.withholdings).where(eq(schema.withholdings.id, id));
    await audit(req, { action: "delete", entity: "withholding", entityId: id });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
