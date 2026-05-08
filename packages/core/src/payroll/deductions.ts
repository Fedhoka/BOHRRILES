import { D, round2 } from "../utils/index.js";
import type { DeductionsInput, DeductionsResult } from "./types.js";

/**
 * Aportes del trabajador (sobre remunerativos):
 *   Jubilación SIPA   11%   (Ley 24.241)
 *   Obra Social        3%   (Ley 23.660)
 *   PAMI/Ley 19.032    3%
 * Sindicato: % según CCT.
 */
export function calcDeductions(input: DeductionsInput): DeductionsResult {
  const rem = D(input.remunerativeTotal);
  const jubilacion = rem.times(0.11);
  const obraSocial = rem.times(0.03);
  const ley19032 = rem.times(0.03);
  const unionFee = rem.times((input.unionDuesPct ?? 0) / 100);
  const incomeTax = D(input.incomeTax4th ?? 0);
  const other = D(input.otherDeductions ?? 0);

  const total = jubilacion.plus(obraSocial).plus(ley19032).plus(unionFee).plus(incomeTax).plus(other);

  return {
    jubilacion: round2(jubilacion),
    obraSocial: round2(obraSocial),
    ley19032: round2(ley19032),
    unionFee: round2(unionFee),
    incomeTax4th: round2(incomeTax),
    otherDeductions: round2(other),
    total: round2(total),
  };
}
