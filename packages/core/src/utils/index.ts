import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

export const D = (v: Decimal.Value) => new Decimal(v);

export const round2 = (v: Decimal.Value): number =>
  new Decimal(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

export const sum = (xs: Decimal.Value[]): Decimal =>
  xs.reduce<Decimal>((acc, x) => acc.plus(x), new Decimal(0));

export const validateCUIT = (cuit: string): boolean => {
  const clean = cuit.replace(/[-\s]/g, "");
  if (!/^\d{11}$/.test(clean)) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let acc = 0;
  for (let i = 0; i < 10; i++) acc += Number(clean[i]) * mult[i]!;
  let dv = 11 - (acc % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) return false;
  return dv === Number(clean[10]);
};

export const cuitEnding = (cuit: string): number => {
  const clean = cuit.replace(/[-\s]/g, "");
  return Number(clean[clean.length - 1] ?? 0);
};

export type Period = `${number}-${"01"|"02"|"03"|"04"|"05"|"06"|"07"|"08"|"09"|"10"|"11"|"12"}`;

export const isValidPeriod = (p: string): p is Period =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(p);

export const periodToDate = (p: Period): Date => {
  const [y, m] = p.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1));
};

export const monthsBetween = (from: Period, to: Period): number => {
  const a = periodToDate(from);
  const b = periodToDate(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
};
