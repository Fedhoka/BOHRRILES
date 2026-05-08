import { Router } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireClient, requireWriteAccess } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound, badRequest } from "../lib/errors.js";
import {
  calcSeverancePay,
  type SeveranceCause,
  validateCUIT as validateCUIL,
} from "@bohr/core";

const r = Router();

const Body = z.object({
  companyId: z.string().uuid(),
  cuil: z.string().refine(validateCUIL, "invalid_cuil"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  hireDate: z.coerce.date(),
  terminationDate: z.coerce.date().optional(),
  cct: z.string().min(1).max(20),
  category: z.string().min(1).max(100),
  baseSalary: z.number().positive(),
  workSchedule: z.enum(["full_time", "part_time"]).default("full_time"),
});

r.use(requireAuth, requireClient);

r.get("/", async (req, res, next) => {
  try {
    const Q = z.object({
      companyId: z.string().uuid().optional(),
      active: z.coerce.boolean().optional(),
    }).parse(req.query);
    const conds = [eq(schema.employees.clientId, req.auth!.clientId!)];
    if (Q.companyId) conds.push(eq(schema.employees.companyId, Q.companyId));
    if (Q.active !== undefined) conds.push(eq(schema.employees.active, Q.active));
    const rows = await db
      .select()
      .from(schema.employees)
      .where(and(...conds))
      .orderBy(desc(schema.employees.hireDate));
    res.json(rows);
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [row] = await db
      .select()
      .from(schema.employees)
      .where(and(eq(schema.employees.id, id), eq(schema.employees.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!row) throw notFound();
    res.json(row);
  } catch (e) { next(e); }
});

r.post("/", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof Body>;
    // Validar que la company pertenezca al cliente
    const [co] = await db.select().from(schema.companies)
      .where(and(eq(schema.companies.id, body.companyId), eq(schema.companies.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!co) throw badRequest("company_not_in_client");
    const [row] = await db.insert(schema.employees).values({ ...body, clientId: req.auth!.clientId! }).returning();
    await audit(req, { action: "create", entity: "employee", entityId: row!.id });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

r.put("/:id", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [row] = await db
      .update(schema.employees)
      .set(req.body as object)
      .where(and(eq(schema.employees.id, id), eq(schema.employees.clientId, req.auth!.clientId!)))
      .returning();
    if (!row) throw notFound();
    await audit(req, { action: "update", entity: "employee", entityId: id });
    res.json(row);
  } catch (e) { next(e); }
});

/** GET /employees/:id/severance — cálculo en vivo. */
r.get("/:id/severance", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const Q = z.object({
      cause: z.enum(["sin_causa", "con_causa", "renuncia", "mutuo_acuerdo", "fallecimiento"]),
      terminationDate: z.coerce.date(),
      vacationDaysAccrued: z.coerce.number().int().min(0).default(0),
    }).parse(req.query);

    const [emp] = await db
      .select()
      .from(schema.employees)
      .where(and(eq(schema.employees.id, id), eq(schema.employees.clientId, req.auth!.clientId!)))
      .limit(1);
    if (!emp) throw notFound();

    // Mejor sueldo de los últimos 12 meses: tomar payrollItems cerrados.
    const last12 = await db
      .select({
        period: schema.payrollRuns.period,
        gross: schema.payrollItems.grossPay,
      })
      .from(schema.payrollItems)
      .innerJoin(schema.payrollRuns, eq(schema.payrollRuns.id, schema.payrollItems.payrollRunId))
      .where(and(
        eq(schema.payrollItems.employeeId, id),
        eq(schema.payrollRuns.status, "closed"),
        eq(schema.payrollRuns.type, "monthly"),
      ));

    const monthlySalariesLast12m = last12.length
      ? last12.map((x) => x.gross).slice(-12)
      : [emp.baseSalary];

    const ms = monthsBetween(emp.hireDate, Q.terminationDate);
    const yearsOfService = Math.floor(ms / 12);
    const monthsInLastFraction = ms % 12;

    const result = calcSeverancePay({
      cause: Q.cause as SeveranceCause,
      monthlySalariesLast12m,
      yearsOfService,
      monthsInLastFraction,
      hireDate: emp.hireDate,
      terminationDate: Q.terminationDate,
      daysIntoTerminationMonth: Q.terminationDate.getUTCDate(),
      daysWorkedCurrentSemester: daysIntoSemester(Q.terminationDate),
      vacationDaysAccrued: Q.vacationDaysAccrued,
    });

    res.json({ employeeId: id, ...result });
  } catch (e) { next(e); }
});

function monthsBetween(a: Date, b: Date): number {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}
function daysIntoSemester(d: Date): number {
  const m = d.getUTCMonth(); // 0..11
  const startMonth = m < 6 ? 0 : 6;
  const start = new Date(Date.UTC(d.getUTCFullYear(), startMonth, 1));
  const diffMs = d.getTime() - start.getTime();
  return Math.min(180, Math.max(0, Math.floor(diffMs / 86_400_000)));
}

export default r;
