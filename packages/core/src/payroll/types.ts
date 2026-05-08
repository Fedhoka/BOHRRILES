import { z } from "zod";

export const CctCodeSchema = z.enum(["130/75", "389/04", "76/75"]); // retail, hospitality, construction
export type CctCode = z.infer<typeof CctCodeSchema>;

export const PayrollRunTypeSchema = z.enum([
  "monthly",
  "bonus_h1",   // SAC primer semestre (jun)
  "bonus_h2",   // SAC segundo semestre (dic)
  "vacation",
  "settlement",
]);
export type PayrollRunType = z.infer<typeof PayrollRunTypeSchema>;

export const SeveranceCauseSchema = z.enum([
  "sin_causa",     // art. 245 LCT
  "con_causa",
  "renuncia",
  "mutuo_acuerdo",
  "fallecimiento",
]);
export type SeveranceCause = z.infer<typeof SeveranceCauseSchema>;

export interface EarningsInput {
  baseSalary: number;
  daysWorked?: number;        // de 30; default 30
  overtime50Hours?: number;
  overtime100Hours?: number;
  hourlyRate?: number;        // si no se pasa, se calcula desde baseSalary / 200
  yearsOfService?: number;
  presenteeismPct?: number;   // % sobre remunerativos
  productivityBonus?: number;
  vacationDays?: number;      // licencia ordinaria
  nonRemunerative?: number;
}

export interface EarningsResult {
  basicSalary: number;
  overtime50: number;
  overtime100: number;
  seniority: number;
  presenteeism: number;
  productivity: number;
  vacationPay: number;
  nonRemunerative: number;
  remunerativeTotal: number;
  grossTotal: number;
}

export interface DeductionsInput {
  remunerativeTotal: number;
  unionDuesPct?: number;          // por CCT, default 0
  otherDeductions?: number;
  incomeTax4th?: number;          // calculado aparte
}

export interface DeductionsResult {
  jubilacion: number;       // 11%
  obraSocial: number;       // 3%
  ley19032: number;         // 3% (PAMI)
  unionFee: number;
  incomeTax4th: number;
  otherDeductions: number;
  total: number;
}

export interface EmployerContributionsInput {
  remunerativeTotal: number;
  isMicroEmployer?: boolean;   // alícuota reducida (Decr. 814/01)
  artFixed?: number;           // cuota fija ART
  artVariablePct?: number;     // alícuota ART variable
}

export interface EmployerContributionsResult {
  jubilacion: number;
  obraSocial: number;
  inssjp: number;
  asignacionesFamiliares: number;
  fnde: number;
  art: number;
  total: number;
}
