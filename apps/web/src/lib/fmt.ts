const ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const PCT = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 2 });

export const currency = (v: number) => ARS.format(v);
export const number = (v: number) => NUM.format(v);
export const percent = (v: number) => PCT.format(v);
export const date = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
