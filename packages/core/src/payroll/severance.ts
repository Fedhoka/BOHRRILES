import { D, round2 } from "../utils/index.js";
import type { SeveranceCause } from "./types.js";

/**
 * Liquidación final por extinción del contrato.
 *
 * Reglas LCT:
 *  - Base art. 245: MEJOR remuneración mensual normal y habitual de los últimos 12 meses
 *    (NO el promedio).
 *  - Indemnización por antigüedad (art. 245): base × años (fracción ≥3 meses cuenta como año)
 *    SOLO en despido sin causa.
 *  - Preaviso (art. 231): 15 días si trabajador <3m; 1 mes si ≤5 años; 2 meses si >5 años.
 *  - Integración mes despido (art. 233): días que faltan para terminar el mes.
 *  - SAC proporcional (art. 123): por días trabajados del semestre.
 *  - Vacaciones no gozadas (art. 156): proporcional sobre divisor 25.
 *
 *  Renuncia / con causa: solo SAC proporcional + vacaciones no gozadas.
 */
export interface SeveranceInput {
  cause: SeveranceCause;
  monthlySalariesLast12m: number[];   // hasta 12 meses, lo que haya
  yearsOfService: number;             // años completos
  monthsInLastFraction: number;       // 0..11 (meses de la fracción incompleta)
  hireDate: Date;
  terminationDate: Date;
  daysIntoTerminationMonth: number;   // 1..31
  daysWorkedCurrentSemester: number;  // para SAC proporcional, 0..180
  vacationDaysAccrued: number;        // días de vacaciones no gozadas
}

export interface SeveranceResult {
  bestSalary12m: number;
  yearsForCompensation: number;
  severanceArt245: number;
  preavisoArt231: number;
  integracionMes: number;
  sacProporcional: number;
  vacacionesNoGozadas: number;
  total: number;
}

export function calcSeverancePay(input: SeveranceInput): SeveranceResult {
  const {
    cause,
    monthlySalariesLast12m,
    yearsOfService,
    monthsInLastFraction,
    daysIntoTerminationMonth,
    daysWorkedCurrentSemester,
    vacationDaysAccrued,
  } = input;

  const best = monthlySalariesLast12m.length
    ? D(Math.max(...monthlySalariesLast12m))
    : D(0);

  // Fracción ≥ 3 meses cuenta como año adicional (art. 245 LCT).
  const yearsForComp = yearsOfService + (monthsInLastFraction >= 3 ? 1 : 0);

  // Solo despido sin causa devenga indemnización por antigüedad.
  let sevArt245 = D(0);
  let preaviso = D(0);
  let integracion = D(0);

  if (cause === "sin_causa") {
    sevArt245 = best.times(yearsForComp);

    // Preaviso: <3m → 15 días; ≤5años → 1 mes; >5años → 2 meses.
    const totalMonths = yearsOfService * 12 + monthsInLastFraction;
    let preavisoMonths = 0;
    let preavisoFractionDays = 0;
    if (totalMonths < 3) preavisoFractionDays = 15;
    else if (yearsOfService <= 5) preavisoMonths = 1;
    else preavisoMonths = 2;

    preaviso = best.times(preavisoMonths).plus(best.div(30).times(preavisoFractionDays));

    // Integración: días que faltan del mes (30 - diaTerminacion).
    const daysLeft = Math.max(0, 30 - daysIntoTerminationMonth);
    integracion = best.div(30).times(daysLeft);
  } else if (cause === "fallecimiento") {
    // Art. 248: 50% del 245.
    sevArt245 = best.times(yearsForComp).times(0.5);
  } else if (cause === "mutuo_acuerdo") {
    // Negociado caso a caso; default sin antigüedad.
  }
  // renuncia / con_causa: sin 245, sin preaviso, sin integración.

  // SAC proporcional: (mejor / 12) × (días_semestre / 180) × 6  =  mejor/2 × días/180
  const sacProp = best.div(2).times(D(daysWorkedCurrentSemester).div(180));

  // Vacaciones no gozadas: días * (sueldo/25)
  const vacNoGoz = best.div(25).times(vacationDaysAccrued);

  const total = sevArt245.plus(preaviso).plus(integracion).plus(sacProp).plus(vacNoGoz);

  return {
    bestSalary12m: round2(best),
    yearsForCompensation: yearsForComp,
    severanceArt245: round2(sevArt245),
    preavisoArt231: round2(preaviso),
    integracionMes: round2(integracion),
    sacProporcional: round2(sacProp),
    vacacionesNoGozadas: round2(vacNoGoz),
    total: round2(total),
  };
}
