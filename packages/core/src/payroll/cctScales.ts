import type { CctCode } from "./types.js";

/**
 * Tablas salariales por CCT y período. La búsqueda devuelve la escala vigente
 * (mayor period ≤ período consultado). Los importes son didácticos / demo —
 * en producción se actualizan vía endpoint /cct-scales.
 */
export interface CctScaleEntry {
  cct: CctCode;
  category: string;
  period: string; // YYYY-MM (vigente desde)
  baseSalary: number;
  hourlyRate?: number;
}

export const CCT_SCALES: CctScaleEntry[] = [
  // Empleados de Comercio (CCT 130/75)
  { cct: "130/75", category: "Maestranza A", period: "2026-01", baseSalary: 480000 },
  { cct: "130/75", category: "Maestranza A", period: "2026-04", baseSalary: 520000 },
  { cct: "130/75", category: "Administrativo A", period: "2026-01", baseSalary: 540000 },
  { cct: "130/75", category: "Administrativo A", period: "2026-04", baseSalary: 580000 },
  { cct: "130/75", category: "Cajero", period: "2026-01", baseSalary: 520000 },
  { cct: "130/75", category: "Cajero", period: "2026-04", baseSalary: 560000 },
  { cct: "130/75", category: "Vendedor B", period: "2026-01", baseSalary: 560000 },
  { cct: "130/75", category: "Vendedor B", period: "2026-04", baseSalary: 600000 },

  // Gastronómicos (CCT 389/04)
  { cct: "389/04", category: "Mozo", period: "2026-01", baseSalary: 500000 },
  { cct: "389/04", category: "Mozo", period: "2026-04", baseSalary: 540000 },
  { cct: "389/04", category: "Cocinero", period: "2026-01", baseSalary: 580000 },
  { cct: "389/04", category: "Cocinero", period: "2026-04", baseSalary: 620000 },
  { cct: "389/04", category: "Encargado", period: "2026-01", baseSalary: 670000 },
  { cct: "389/04", category: "Encargado", period: "2026-04", baseSalary: 720000 },

  // UOCRA - Construcción (CCT 76/75)
  { cct: "76/75", category: "Ayudante", period: "2026-01", baseSalary: 560000, hourlyRate: 3300 },
  { cct: "76/75", category: "Ayudante", period: "2026-04", baseSalary: 600000, hourlyRate: 3500 },
  { cct: "76/75", category: "Oficial", period: "2026-01", baseSalary: 720000, hourlyRate: 4200 },
  { cct: "76/75", category: "Oficial", period: "2026-04", baseSalary: 760000, hourlyRate: 4400 },
  { cct: "76/75", category: "Oficial Especializado", period: "2026-01", baseSalary: 840000, hourlyRate: 4900 },
  { cct: "76/75", category: "Oficial Especializado", period: "2026-04", baseSalary: 880000, hourlyRate: 5100 },
];

/**
 * Devuelve la escala vigente para un CCT/categoría en un período dado.
 * Usa el último period ≤ targetPeriod (resolución histórica correcta).
 */
export function lookupCctScale(
  cct: CctCode,
  category: string,
  targetPeriod: string,
): CctScaleEntry | undefined {
  const candidates = CCT_SCALES.filter(
    (s) => s.cct === cct && s.category === category && s.period <= targetPeriod,
  ).sort((a, b) => b.period.localeCompare(a.period));
  return candidates[0];
}

export function listCategoriesForCct(cct: CctCode): string[] {
  const set = new Set<string>();
  for (const s of CCT_SCALES) if (s.cct === cct) set.add(s.category);
  return [...set];
}
