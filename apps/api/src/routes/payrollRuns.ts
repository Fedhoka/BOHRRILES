import { Router } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireClient, requireWriteAccess } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound, conflict } from "../lib/errors.js";
import { computePayrollItems } from "../services/payrollRun.js";

const r = Router();
const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

const ItemInput = z.object({
  employeeId: z.string().uuid(),
  daysWorked: z.number().int().min(0).max(31).default(30),
  overtime50Hours: z.number().min(0).max(200).default(0),
  overtime100Hours: z.number().min(0).max(200).default(0),
  presenteeismPct: z.number().min(0).max(100).default(0),
  productivityBonus: z.number().min(0).default(0),
  vacationDays: z.number().int().min(0).max(60).default(0),
  nonRemunerative: z.number().min(0).default(0),
  unionDuesPct: z.number().min(0).max(10).default(0),
  otherDeductions: z.number().min(0).default(0),
  hasSpouse: z.boolean().default(false),
  childrenCount: z.number().int().min(0).max(20).default(0),
  ytdWithheldPriorMonths: z.number().min(0).default(0),
});

const RunBody = z.object({
  companyId: z.string().uuid(),
  period: z.string().regex(periodRe),
  type: z.enum(["monthly", "bonus_h1", "bonus_h2", "vacation", "settlement"]),
  items: z.array(ItemInput).min(1).max(2000),
});

r.use(requireAuth, requireClient);

/** GET /payroll-runs?period=&companyId= */
r.get("/", async (req, res, next) => {
  try {
    const Q = z.object({
      period: z.string().regex(periodRe).optional(),
      companyId: z.string().uuid().optional(),
    }).parse(req.query);
    const conds = [eq(schema.payrollRuns.clientId, req.auth!.clientId!)];
    if (Q.period) conds.push(eq(schema.payrollRuns.period, Q.period));
    if (Q.companyId) conds.push(eq(schema.payrollRuns.companyId, Q.companyId));
    const rows = await db.select().from(schema.payrollRuns).where(and(...conds)).orderBy(desc(schema.payrollRuns.period));
    res.json(rows);
  } catch (e) { next(e); }
});

/** GET /payroll-runs/:id (incluye items) */
r.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [run] = await db.select().from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!run) throw notFound();
    const items = await db.select().from(schema.payrollItems).where(eq(schema.payrollItems.payrollRunId, id));
    res.json({ ...run, items });
  } catch (e) { next(e); }
});

/** POST /payroll-runs — crea borrador con cálculo. */
r.post("/", requireWriteAccess, validate(RunBody), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof RunBody>;

    const [co] = await db.select().from(schema.companies)
      .where(and(eq(schema.companies.id, body.companyId), eq(schema.companies.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!co) throw notFound("company_not_found");

    const [existing] = await db.select().from(schema.payrollRuns)
      .where(and(
        eq(schema.payrollRuns.clientId, req.auth!.clientId!),
        eq(schema.payrollRuns.companyId, body.companyId),
        eq(schema.payrollRuns.period, body.period),
        eq(schema.payrollRuns.type, body.type),
      )).limit(1);
    if (existing) throw conflict("run_exists");

    const items = await computePayrollItems(
      req.auth!.clientId!,
      body.companyId,
      body.period,
      body.type,
      body.items,
    );

    const [run] = await db.insert(schema.payrollRuns).values({
      clientId: req.auth!.clientId!,
      companyId: body.companyId,
      period: body.period,
      type: body.type,
      status: "draft",
    }).returning();

    if (items.length) {
      await db.insert(schema.payrollItems).values(items.map((i) => ({ ...i, payrollRunId: run!.id })));
    }
    await audit(req, { action: "create", entity: "payroll_run", entityId: run!.id });
    res.status(201).json(run);
  } catch (e) { next(e); }
});

/** POST /payroll-runs/:id/close — snapshot inmutable + libro digital de sueldos. */
r.post("/:id/close", requireWriteAccess, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [run] = await db.select().from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!run) throw notFound();
    if (run.status === "closed") throw conflict("already_closed");

    const items = await db.select().from(schema.payrollItems).where(eq(schema.payrollItems.payrollRunId, id));

    // Libro digital LCT art. 52 — campos requeridos por trabajador
    const wageBook = items.map((i) => ({
      employeeId: i.employeeId,
      grossPay: i.grossPay,
      totalDeductions: i.totalDeductions,
      netPay: i.netPay,
      employerContributions: i.employerContributions,
      art: i.art,
    }));

    const snapshot = {
      closedAt: Date.now(),
      closedBy: req.auth!.userId,
      run,
      items,
      wageBook,
      totals: {
        gross: items.reduce((a, b) => a + b.grossPay, 0),
        net: items.reduce((a, b) => a + b.netPay, 0),
        deductions: items.reduce((a, b) => a + b.totalDeductions, 0),
        employerContributions: items.reduce((a, b) => a + b.employerContributions, 0),
        art: items.reduce((a, b) => a + b.art, 0),
      },
    };

    const [updated] = await db.update(schema.payrollRuns).set({
      status: "closed",
      closedAt: new Date(),
      closedBy: req.auth!.userId,
      snapshot,
    }).where(eq(schema.payrollRuns.id, id)).returning();

    await audit(req, { action: "close", entity: "payroll_run", entityId: id });
    res.json(updated);
  } catch (e) { next(e); }
});

/** GET /payroll-runs/:id/wage-book — libro digital extraído del snapshot. */
r.get("/:id/wage-book", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [run] = await db.select().from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!run) throw notFound();
    if (!run.snapshot) return res.status(409).json({ error: "not_closed" });
    const snap = run.snapshot as { wageBook: unknown };
    res.json(snap.wageBook);
  } catch (e) { next(e); }
});

export default r;
