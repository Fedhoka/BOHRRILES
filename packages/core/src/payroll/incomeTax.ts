import { D, round2 } from "../utils/index.js";

/**
 * Impuesto a las Ganancias 4ta Categoría — Régimen de retención RG 4003.
 *
 * MÉTODO ACUMULATIVO ANUAL:
 *  1. Se acumula la remuneración bruta del año hasta el período actual.
 *  2. Se restan las deducciones acumuladas (jubilación, OS, ley 19.032,
 *     mínimo no imponible, deducción especial, cargas de familia).
 *  3. Se aplica la escala progresiva sobre la ganancia neta sujeta a impuesto
 *     ANUALIZADA (proyectada al año o tomada como acumulada según RG 4003).
 *  4. Se calcula el impuesto determinado a la fecha.
 *  5. Se restan las retenciones de meses anteriores → retención del mes.
 *
 * Esta implementación usa la variante: el período N retiene el impuesto
 * resultante de aplicar la escala al acumulado, menos lo retenido en períodos
 * 1..N-1 dentro del mismo año.
 */

/** Tramos escala art. 94 — valores demo, anual neto sujeto a impuesto. */
export const SCALE_2026: Array<{ from: number; to: number; rate: number; fixed: number }> = [
  { from: 0,            to: 1_500_000,   rate: 0.05, fixed: 0 },
  { from: 1_500_000,    to: 3_000_000,   rate: 0.09, fixed: 75_000 },
  { from: 3_000_000,    to: 4_500_000,   rate: 0.12, fixed: 210_000 },
  { from: 4_500_000,    to: 6_000_000,   rate: 0.15, fixed: 390_000 },
  { from: 6_000_000,    to: 9_000_000,   rate: 0.19, fixed: 615_000 },
  { from: 9_000_000,    to: 12_000_000,  rate: 0.23, fixed: 1_185_000 },
  { from: 12_000_000,   to: 18_000_000,  rate: 0.27, fixed: 1_875_000 },
  { from: 18_000_000,   to: 24_000_000,  rate: 0.31, fixed: 3_495_000 },
  { from: 24_000_000,   to: Infinity,    rate: 0.35, fixed: 5_355_000 },
];

/** Importes anuales — valores demo de referencia. */
export const ANNUAL_DEDUCTIONS_2026 = {
  minimumNonTaxable: 3_500_000,
  specialDeduction: 16_800_000,   // 4.8 × MNI (relación dependencia)
  spouse: 3_300_000,
  child: 1_660_000,
};

export interface IncomeTax4thInput {
  /** Mes 1..12 dentro del año fiscal. */
  monthIndex: number;
  /** Acumulado de remuneración bruta del año hasta el mes actual (incluye este mes). */
  ytdGrossRemuneration: number;
  /** Aportes acumulados (jubilación 11% + OS 3% + ley 19.032 3%). */
  ytdMandatoryContributions: number;
  /** Otras deducciones del decreto (alquiler, médicos, intereses hipotecarios, etc.). */
  ytdOtherDeductions?: number;
  /** Cargas de familia. */
  hasSpouse?: boolean;
  childrenCount?: number;
  /** Retenciones aplicadas en meses 1..(monthIndex-1) dentro de este mismo año. */
  ytdWithheldPriorMonths: number;
}

export interface IncomeTax4thResult {
  netTaxableYTD: number;
  determinedTax: number;
  withheldThisMonth: number;
}

function applyScale(annualNetTaxable: number): number {
  if (annualNetTaxable <= 0) return 0;
  for (const tier of SCALE_2026) {
    if (annualNetTaxable <= tier.to) {
      const excess = D(annualNetTaxable).minus(tier.from);
      return round2(D(tier.fixed).plus(excess.times(tier.rate)));
    }
  }
  return 0;
}

export function calcIncomeTax4th(input: IncomeTax4thInput): IncomeTax4thResult {
  const m = Math.max(1, Math.min(12, input.monthIndex));
  // Deducciones personales prorrateadas a la cantidad de meses transcurridos.
  const personalDeductionsAnnual = D(ANNUAL_DEDUCTIONS_2026.minimumNonTaxable)
    .plus(ANNUAL_DEDUCTIONS_2026.specialDeduction)
    .plus(input.hasSpouse ? ANNUAL_DEDUCTIONS_2026.spouse : 0)
    .plus(D(ANNUAL_DEDUCTIONS_2026.child).times(input.childrenCount ?? 0));
  const personalDeductionsYTD = personalDeductionsAnnual.times(m).div(12);

  const netTaxableYTD = D(input.ytdGrossRemuneration)
    .minus(input.ytdMandatoryContributions)
    .minus(input.ytdOtherDeductions ?? 0)
    .minus(personalDeductionsYTD);

  if (netTaxableYTD.lte(0)) {
    return {
      netTaxableYTD: round2(netTaxableYTD),
      determinedTax: 0,
      withheldThisMonth: 0,
    };
  }

  // Anualizamos la base proporcionalmente para aplicar escala anual,
  // luego prorrateamos al mes en curso (regla acumulativa RG 4003).
  const annualizedBase = netTaxableYTD.times(12).div(m);
  const annualTax = applyScale(Number(annualizedBase.toString()));
  const taxYTD = D(annualTax).times(m).div(12);

  const withheldThisMonth = D(taxYTD).minus(input.ytdWithheldPriorMonths);

  return {
    netTaxableYTD: round2(netTaxableYTD),
    determinedTax: round2(taxYTD),
    withheldThisMonth: round2(withheldThisMonth.lt(0) ? D(0) : withheldThisMonth),
  };
}
