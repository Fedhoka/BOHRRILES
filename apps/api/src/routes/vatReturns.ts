import { Router } from "express";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireClient, requireWriteAccess } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { conflict, notFound } from "../lib/errors.js";
import { buildVatReturn, vatDueDate } from "../services/vatReturn.js";

const r = Router();
const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

r.use(requireAuth, requireClient);

/** GET /vat-returns/preview?period=YYYY-MM — calcula sin cerrar. */
r.get("/preview", async (req, res, next) => {
  try {
    const Q = z.object({ period: z.string().regex(periodRe) }).parse(req.query);
    const out = await buildVatReturn(req.auth!.clientId!, Q.period);
    res.json(out);
  } catch (e) { next(e); }
});

/** GET /vat-returns/history — serie mensual de los últimos 12 períodos cerrados. */
r.get("/history", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.vatReturns)
      .where(eq(schema.vatReturns.clientId, req.auth!.clientId!))
      .orderBy(asc(schema.vatReturns.period));
    res.json(rows);
  } catch (e) { next(e); }
});

/** GET /vat-returns/:period — devuelve el cierre inmutable. */
r.get("/:period", async (req, res, next) => {
  try {
    const period = String(req.params.period);
    if (!periodRe.test(period)) return next(notFound());
    const [row] = await db
      .select()
      .from(schema.vatReturns)
      .where(and(eq(schema.vatReturns.clientId, req.auth!.clientId!), eq(schema.vatReturns.period, period)))
      .limit(1);
    if (!row) throw notFound();
    res.json(row);
  } catch (e) { next(e); }
});

/** GET /vat-returns/due-dates — vencimientos por dígito CUIT */
r.get("/_/due-dates", async (req, res, next) => {
  try {
    const period = String(req.query.period ?? "");
    if (!periodRe.test(period)) throw notFound();
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, req.auth!.clientId!))
      .limit(1);
    if (!client) throw notFound();
    res.json({ period, due: vatDueDate(client.cuit, period) });
  } catch (e) { next(e); }
});

/** POST /vat-returns/:period/close — snapshot inmutable. */
r.post(
  "/:period/close",
  requireWriteAccess,
  validate(z.object({}), "body"),
  async (req, res, next) => {
    try {
      const period = String(req.params.period);
      if (!periodRe.test(period)) throw notFound();

      const [existing] = await db
        .select({ id: schema.vatReturns.id })
        .from(schema.vatReturns)
        .where(and(eq(schema.vatReturns.clientId, req.auth!.clientId!), eq(schema.vatReturns.period, period)))
        .limit(1);
      if (existing) throw conflict("already_closed");

      const built = await buildVatReturn(req.auth!.clientId!, period);
      const r2 = built.result;

      const [created] = await db
        .insert(schema.vatReturns)
        .values({
          clientId: req.auth!.clientId!,
          period,
          closedAt: new Date(),
          closedBy: req.auth!.userId,
          debitVat: r2.debitVat,
          creditVat: r2.creditVatAfterProportionality,
          proportionalityFactor: r2.proportionalityFactor,
          withholdingsApplied: r2.withholdingsApplied,
          perceptionsApplied: r2.perceptionsApplied,
          technicalBalancePrevious: built.previous?.technicalBalanceNext ?? 0,
          freeBalancePrevious: built.previous?.freeBalanceNext ?? 0,
          technicalBalanceNext: r2.technicalBalanceNext,
          freeBalanceNext: r2.freeBalanceNext,
          payable: r2.payable,
          snapshot: { result: r2, counts: built.counts, previous: built.previous, closedAt: Date.now() },
        })
        .returning();

      await audit(req, { action: "close", entity: "vat_return", entityId: created!.id, meta: { period } });
      res.status(201).json(created);
    } catch (e) { next(e); }
  },
);

export default r;
