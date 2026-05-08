import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import {
  calcVatReturn,
  type VatInvoice,
  type Withholding,
  type Perception,
} from "@bohr/core";

export async function buildVatReturn(clientId: string, period: string) {
  const [sales, purchases, wh, perc, prev] = await Promise.all([
    db.select().from(schema.salesInvoices).where(and(eq(schema.salesInvoices.clientId, clientId), eq(schema.salesInvoices.period, period))),
    db.select().from(schema.purchaseInvoices).where(and(eq(schema.purchaseInvoices.clientId, clientId), eq(schema.purchaseInvoices.period, period))),
    db.select().from(schema.withholdings).where(and(eq(schema.withholdings.clientId, clientId), eq(schema.withholdings.period, period))),
    db.select().from(schema.perceptions).where(and(eq(schema.perceptions.clientId, clientId), eq(schema.perceptions.period, period))),
    findPreviousReturn(clientId, period),
  ]);

  const salesIn: VatInvoice[] = sales.map((s) => ({
    id: s.id,
    invoiceType: s.invoiceType,
    netAmount: s.netAmount,
    vat21: s.vat21,
    vat105: s.vat105,
    vat27: s.vat27,
    exempt: s.exempt,
    isPayroll: false,
    taxedActivity: true,
  }));

  const purchasesIn: VatInvoice[] = purchases.map((p) => ({
    id: p.id,
    invoiceType: p.invoiceType,
    netAmount: p.netAmount,
    vat21: p.vat21,
    vat105: p.vat105,
    vat27: p.vat27,
    exempt: p.exempt,
    isPayroll: p.isPayroll,
    taxedActivity: true,
  }));

  const withholdingsIn: Withholding[] = wh.map((w) => ({ id: w.id, taxType: w.taxType, amount: w.amount }));
  const perceptionsIn: Perception[] = perc.map((p) => ({ id: p.id, taxType: p.taxType, amount: p.amount }));

  const result = calcVatReturn({
    sales: salesIn,
    purchases: purchasesIn,
    withholdings: withholdingsIn,
    perceptions: perceptionsIn,
    technicalBalancePrevious: prev?.technicalBalanceNext ?? 0,
    freeBalancePrevious: prev?.freeBalanceNext ?? 0,
  });

  return {
    result,
    counts: { sales: sales.length, purchases: purchases.length, withholdings: wh.length, perceptions: perc.length },
    previous: prev ? { period: prev.period, technicalBalanceNext: prev.technicalBalanceNext, freeBalanceNext: prev.freeBalanceNext } : null,
  };
}

async function findPreviousReturn(clientId: string, period: string) {
  const prevPeriod = decrementPeriod(period);
  const [row] = await db
    .select()
    .from(schema.vatReturns)
    .where(and(eq(schema.vatReturns.clientId, clientId), eq(schema.vatReturns.period, prevPeriod)))
    .limit(1);
  return row;
}

export function decrementPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (m === 1) return `${y! - 1}-12`;
  return `${y}-${String(m! - 1).padStart(2, "0")}`;
}

export function incrementPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (m === 12) return `${y! + 1}-01`;
  return `${y}-${String(m! + 1).padStart(2, "0")}`;
}

/**
 * Vencimiento del IVA según último dígito del CUIT (RG AFIP, fechas demo).
 */
export function vatDueDate(cuit: string, period: string): Date {
  const lastDigit = Number(cuit.slice(-1)) || 0;
  const [y, m] = period.split("-").map(Number);
  // Mes siguiente, día = 18 + (lastDigit fila), valores demo.
  const baseDay = 18 + Math.floor(lastDigit / 2);
  const next = new Date(Date.UTC(y!, m!, Math.min(baseDay, 28)));
  return next;
}
