import { D, round2 } from "../utils/index.js";
import type { EarningsInput, EarningsResult } from "./types.js";

/**
 * Antigüedad: 1% del básico por año de servicio (típico CCT comercio).
 */
function calcSeniority(baseSalary: number, years: number): number {
  return round2(D(baseSalary).times(0.01).times(years));
}

/**
 * Hora extra al 50% (lun-sab hasta 13hs): valor hora * 1.5
 * Hora extra al 100% (sab >13hs, dom y feriados): valor hora * 2
 * Si no se pasa hourlyRate, se calcula desde básico/200 (jornada legal).
 */
export function calcEarnings(input: EarningsInput): EarningsResult {
  const days = input.daysWorked ?? 30;
  const baseProrated = D(input.baseSalary).times(days).div(30);

  const hourly = D(input.hourlyRate ?? input.baseSalary / 200);
  const ot50 = hourly.times(1.5).times(input.overtime50Hours ?? 0);
  const ot100 = hourly.times(2).times(input.overtime100Hours ?? 0);

  const seniority = calcSeniority(input.baseSalary, input.yearsOfService ?? 0);

  const presenteeismBase = baseProrated.plus(seniority);
  const presenteeism = presenteeismBase.times((input.presenteeismPct ?? 0) / 100);

  const productivity = D(input.productivityBonus ?? 0);

  // Vacation pay: días * (sueldo/25) — divisor LCT art. 155
  const vacationPay = D(input.baseSalary).div(25).times(input.vacationDays ?? 0);

  const nonRem = D(input.nonRemunerative ?? 0);

  const remunerative = baseProrated
    .plus(ot50)
    .plus(ot100)
    .plus(seniority)
    .plus(presenteeism)
    .plus(productivity)
    .plus(vacationPay);

  const gross = remunerative.plus(nonRem);

  return {
    basicSalary: round2(baseProrated),
    overtime50: round2(ot50),
    overtime100: round2(ot100),
    seniority: round2(seniority),
    presenteeism: round2(presenteeism),
    productivity: round2(productivity),
    vacationPay: round2(vacationPay),
    nonRemunerative: round2(nonRem),
    remunerativeTotal: round2(remunerative),
    grossTotal: round2(gross),
  };
}
