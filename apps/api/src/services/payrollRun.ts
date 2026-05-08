import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import {
  calcEarnings,
  calcDeductions,
  calcEmployerContributions,
  calcIncomeTax4th,
  calcBonusPay,
} from "@bohr/core";

export interface PayrollItemInput {
  employeeId: string;
  daysWorked?: number;
  overtime50Hours?: number;
  overtime100Hours?: number;
  presenteeismPct?: number;
  productivityBonus?: number;
  vacationDays?: number;
  nonRemunerative?: number;
  unionDuesPct?: number;
  otherDeductions?: number;
  hasSpouse?: boolean;
  childrenCount?: number;
  /** Acumulado de retenciones de Ganancias 4ta de meses anteriores en este año. */
  ytdWithheldPriorMonths?: number;
}

export async function computePayrollItems(
  clientId: string,
  companyId: string,
  period: string,
  type: "monthly" | "bonus_h1" | "bonus_h2" | "vacation" | "settlement",
  inputs: PayrollItemInput[],
) {
  const employees = await db
    .select()
    .from(schema.employees)
    .where(and(eq(schema.employees.clientId, clientId), eq(schema.employees.companyId, companyId)));
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const monthIndex = Number(period.split("-")[1]);
  const fiscalYear = Number(period.split("-")[0]);

  const items: Array<typeof schema.payrollItems.$inferInsert & {
    snapshot: Record<string, unknown>;
  }> = [];

  for (const inp of inputs) {
    const emp = empMap.get(inp.employeeId);
    if (!emp) continue;

    const yearsOfService = Math.max(
      0,
      Math.floor((Date.UTC(fiscalYear, monthIndex - 1, 1) - emp.hireDate.getTime()) / (365.25 * 86_400_000)),
    );

    let bonusPay = 0;
    if (type === "bonus_h1" || type === "bonus_h2") {
      // Buscar mejores remuneraciones del semestre — para demo usamos baseSalary x6.
      const monthly = Array(6).fill(emp.baseSalary);
      bonusPay = calcBonusPay({ monthlyRemunerations: monthly }).bonusPay;
    }

    const earnings = calcEarnings({
      baseSalary: emp.baseSalary,
      daysWorked: inp.daysWorked ?? 30,
      overtime50Hours: inp.overtime50Hours,
      overtime100Hours: inp.overtime100Hours,
      yearsOfService,
      presenteeismPct: inp.presenteeismPct,
      productivityBonus: inp.productivityBonus,
      vacationDays: inp.vacationDays,
      nonRemunerative: inp.nonRemunerative,
    });

    const remTotal = earnings.remunerativeTotal + bonusPay;

    // Ganancias 4ta acumulativo: calcular bruto y aportes acumulados anuales.
    const ytdRows = await db
      .select({
        gross: schema.payrollItems.grossPay,
        contrib: schema.payrollItems.jubilacion,
      })
      .from(schema.payrollItems)
      .innerJoin(schema.payrollRuns, eq(schema.payrollRuns.id, schema.payrollItems.payrollRunId))
      .where(and(
        eq(schema.payrollItems.employeeId, emp.id),
        eq(schema.payrollRuns.status, "closed"),
      ));

    const ytdGross = ytdRows.reduce((a, b) => a + b.gross, 0) + earnings.grossTotal + bonusPay;
    const ytdMandatory = (ytdRows.reduce((a, b) => a + b.contrib, 0) / 0.11) * 0.17 + remTotal * 0.17;

    const tax = calcIncomeTax4th({
      monthIndex,
      ytdGrossRemuneration: ytdGross,
      ytdMandatoryContributions: ytdMandatory,
      ytdWithheldPriorMonths: inp.ytdWithheldPriorMonths ?? 0,
      hasSpouse: inp.hasSpouse,
      childrenCount: inp.childrenCount,
    });

    const deductions = calcDeductions({
      remunerativeTotal: remTotal,
      unionDuesPct: inp.unionDuesPct,
      otherDeductions: inp.otherDeductions,
      incomeTax4th: tax.withheldThisMonth,
    });

    const employer = calcEmployerContributions({ remunerativeTotal: remTotal });

    items.push({
      employeeId: emp.id,
      payrollRunId: "",
      basicSalary: earnings.basicSalary,
      overtime50: earnings.overtime50,
      overtime100: earnings.overtime100,
      seniority: earnings.seniority,
      presenteeism: earnings.presenteeism,
      productivity: earnings.productivity,
      vacationPay: earnings.vacationPay,
      bonusPay,
      nonRemunerative: earnings.nonRemunerative,
      jubilacion: deductions.jubilacion,
      obraSocial: deductions.obraSocial,
      ley19032: deductions.ley19032,
      unionFee: deductions.unionFee,
      incomeTax4th: deductions.incomeTax4th,
      otherDeductions: deductions.otherDeductions,
      employerContributions: employer.total - employer.art,
      art: employer.art,
      grossPay: earnings.grossTotal + bonusPay,
      totalDeductions: deductions.total,
      netPay: earnings.grossTotal + bonusPay - deductions.total,
      snapshot: { earnings, deductions, employer, tax, bonusPay },
    });
  }

  return items;
}
