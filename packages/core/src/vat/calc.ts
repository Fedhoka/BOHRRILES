import { D, round2, sum } from "../utils/index.js";
import { purchaseGrantsCredit } from "./rules.js";
import type {
  VatInvoice,
  Withholding,
  Perception,
  VatReturnInput,
  VatReturnResult,
} from "./types.js";

/**
 * Débito fiscal: suma de IVA de las ventas (todas las alícuotas).
 * Aplica a todas las facturas de venta independientemente del tipo (A/B/C/M/E).
 */
export function calcVatDebit(sales: VatInvoice[]): {
  total: number;
  vat21: number;
  vat105: number;
  vat27: number;
} {
  const v21 = sum(sales.map((s) => s.vat21));
  const v105 = sum(sales.map((s) => s.vat105));
  const v27 = sum(sales.map((s) => s.vat27));
  return {
    total: round2(v21.plus(v105).plus(v27)),
    vat21: round2(v21),
    vat105: round2(v105),
    vat27: round2(v27),
  };
}

/**
 * Crédito fiscal bruto: solo de compras tipo A/M, no sueldos, actividad gravada.
 * Devuelve también las compras rechazadas con motivo (para auditoría).
 */
export function calcVatCredit(purchases: VatInvoice[]): {
  total: number;
  vat21: number;
  vat105: number;
  vat27: number;
  rejected: { id: string; reason: string; amount: number }[];
} {
  const valid: VatInvoice[] = [];
  const rejected: { id: string; reason: string; amount: number }[] = [];
  for (const p of purchases) {
    const r = purchaseGrantsCredit(p);
    const amount = round2(D(p.vat21).plus(p.vat105).plus(p.vat27));
    if (r.ok) valid.push(p);
    else if (amount > 0) rejected.push({ id: p.id, reason: r.reason!, amount });
  }
  const v21 = sum(valid.map((p) => p.vat21));
  const v105 = sum(valid.map((p) => p.vat105));
  const v27 = sum(valid.map((p) => p.vat27));
  return {
    total: round2(v21.plus(v105).plus(v27)),
    vat21: round2(v21),
    vat105: round2(v105),
    vat27: round2(v27),
    rejected,
  };
}

/**
 * Coeficiente de prorrateo (operaciones gravadas / total) cuando el contribuyente
 * tiene actividades mixtas (gravadas + exentas) y no puede atribuir cada compra
 * directamente. Se aplica al crédito fiscal de compras de uso común.
 *
 * factor = ventas_gravadas_netas / (ventas_gravadas_netas + ventas_exentas)
 * Si todo es gravado → 1. Si todo es exento → 0. Si no hay ventas → 1 (no proratear).
 */
export function calcProportionality(sales: VatInvoice[]): number {
  let taxed = D(0);
  let exempt = D(0);
  for (const s of sales) {
    const hasVat = D(s.vat21).plus(s.vat105).plus(s.vat27).gt(0);
    if (hasVat) taxed = taxed.plus(s.netAmount);
    else exempt = exempt.plus(s.netAmount).plus(s.exempt);
  }
  const total = taxed.plus(exempt);
  if (total.eq(0)) return 1;
  return Number(taxed.div(total).toDecimalPlaces(4).toString());
}

/**
 * Liquidación mensual de IVA.
 *
 * Reglas críticas:
 *  - Saldo técnico (DF<CF): se traslada al mes siguiente, NO es de libre disponibilidad.
 *  - Retenciones/percepciones: SÓLO reducen el saldo a pagar (no el crédito fiscal).
 *  - Si tras retenciones queda saldo a favor, se acumula como "saldo de libre disponibilidad".
 *  - Sueldos NUNCA generan crédito fiscal (filtrado en calcVatCredit).
 */
export function calcVatReturn(input: VatReturnInput): VatReturnResult {
  const debit = calcVatDebit(input.sales);
  const creditGross = calcVatCredit(input.purchases);

  const factor = calcProportionality(input.sales);
  const creditAfterProp = round2(D(creditGross.total).times(factor));

  // Saldo técnico del período: débito - crédito (proporcional) - saldo técnico previo
  const balance = D(debit.total)
    .minus(creditAfterProp)
    .minus(input.technicalBalancePrevious);

  let technicalBalanceCurrent = 0;
  let payableBeforeWh = 0;
  let technicalBalanceNext = 0;

  if (balance.gte(0)) {
    // Hay saldo a pagar antes de retenciones
    payableBeforeWh = round2(balance);
    technicalBalanceCurrent = round2(balance);
    technicalBalanceNext = 0;
  } else {
    // Crédito > débito → todo el excedente es técnico, se acumula al siguiente
    technicalBalanceCurrent = 0;
    payableBeforeWh = 0;
    technicalBalanceNext = round2(balance.abs());
  }

  // Retenciones IVA aplicadas + percepciones IVA + saldo libre previo reducen el a pagar
  const ivaWh = sum(input.withholdings.filter((w) => w.taxType === "iva").map((w) => w.amount));
  const ivaPerc = sum(input.perceptions.filter((p) => p.taxType === "iva").map((p) => p.amount));
  const freeBalancePrev = D(input.freeBalancePrevious);

  const totalCredits = ivaWh.plus(ivaPerc).plus(freeBalancePrev);
  const payableAfter = D(payableBeforeWh).minus(totalCredits);

  let payable = 0;
  let freeBalanceNext = 0;
  if (payableAfter.gte(0)) {
    payable = round2(payableAfter);
    freeBalanceNext = 0;
  } else {
    payable = 0;
    freeBalanceNext = round2(payableAfter.abs());
  }

  return {
    debitVat: debit.total,
    creditVatGross: creditGross.total,
    proportionalityFactor: factor,
    creditVatAfterProportionality: creditAfterProp,
    technicalBalanceCurrent,
    technicalBalanceNext,
    withholdingsApplied: round2(ivaWh),
    perceptionsApplied: round2(ivaPerc),
    freeBalanceNext,
    payable,
    detail: {
      debit: { vat21: debit.vat21, vat105: debit.vat105, vat27: debit.vat27 },
      credit: { vat21: creditGross.vat21, vat105: creditGross.vat105, vat27: creditGross.vat27 },
      rejectedCredit: creditGross.rejected.map((r) => ({ reason: r.reason, amount: r.amount })),
    },
  };
}
