import { D, round2 } from "../utils/index.js";
import type { EmployerContributionsInput, EmployerContributionsResult } from "./types.js";

/**
 * Contribuciones patronales (Decr. 814/01):
 *   Jubilación SIPA          12.71% (10.77% micro)
 *   INSSJP / PAMI             1.59% (1.35%)
 *   Obra Social               6.00%
 *   Asignaciones familiares   5.40% (4.59%)
 *   Fondo Nacional Empleo     1.11% (0.94%)
 * ART: cuota fija + alícuota variable sobre remuneración bruta.
 */
const RATES = {
  full: { jub: 12.71, inssjp: 1.59, os: 6.0, asig: 5.4, fnde: 1.11 },
  micro: { jub: 10.77, inssjp: 1.35, os: 6.0, asig: 4.59, fnde: 0.94 },
};

export function calcEmployerContributions(
  input: EmployerContributionsInput,
): EmployerContributionsResult {
  const r = input.isMicroEmployer ? RATES.micro : RATES.full;
  const rem = D(input.remunerativeTotal);

  const jubilacion = rem.times(r.jub / 100);
  const inssjp = rem.times(r.inssjp / 100);
  const obraSocial = rem.times(r.os / 100);
  const asig = rem.times(r.asig / 100);
  const fnde = rem.times(r.fnde / 100);
  const art = D(input.artFixed ?? 0).plus(rem.times((input.artVariablePct ?? 0) / 100));

  const total = jubilacion.plus(inssjp).plus(obraSocial).plus(asig).plus(fnde).plus(art);

  return {
    jubilacion: round2(jubilacion),
    obraSocial: round2(obraSocial),
    inssjp: round2(inssjp),
    asignacionesFamiliares: round2(asig),
    fnde: round2(fnde),
    art: round2(art),
    total: round2(total),
  };
}
