import { D, round2 } from "../utils/index.js";

/**
 * SAC (Sueldo Anual Complementario) — Ley 27.073, art. 121 LCT.
 *
 * Regla crítica: la base es la MEJOR remuneración mensual devengada del
 * semestre (NO el promedio). Si el trabajador no laboró el semestre completo,
 * se proporciona por días trabajados sobre 180.
 *
 *   SAC = (mejor_remuneración_semestre / 12) × (días_trabajados / 180) × ...
 *   Versión simplificada (semestre completo): SAC = mejor / 2
 */
export interface BonusInput {
  /** Mensuales remunerativas del semestre (jun: ene-jun, dic: jul-dic). 6 valores. */
  monthlyRemunerations: number[];
  /** Días efectivamente trabajados en el semestre (default 180). */
  daysWorkedInSemester?: number;
}

export interface BonusResult {
  bestMonth: number;
  daysWorked: number;
  proRata: number;
  bonusPay: number;
}

export function calcBonusPay(input: BonusInput): BonusResult {
  if (input.monthlyRemunerations.length === 0) {
    return { bestMonth: 0, daysWorked: 0, proRata: 0, bonusPay: 0 };
  }
  const best = D(Math.max(...input.monthlyRemunerations));
  const days = input.daysWorkedInSemester ?? 180;
  const proRata = D(days).div(180);
  // SAC = (best / 12) * 6 meses * (días/180)  →  best/2 * (días/180)
  const bonus = best.div(2).times(proRata);
  return {
    bestMonth: round2(best),
    daysWorked: days,
    proRata: Number(proRata.toDecimalPlaces(4).toString()),
    bonusPay: round2(bonus),
  };
}
