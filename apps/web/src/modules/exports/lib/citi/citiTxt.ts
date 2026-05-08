/**
 * Genera archivos TXT CITI RG 3685 (ventas y compras).
 * Formato: campos de longitud fija separados por pipe, un registro por línea.
 *
 * Estructura simplificada (campos clave de ventas CITI):
 *   Fecha(8)|TipoComp(3)|PtoVenta(5)|Numero(8)|CUIT(11)|Neto(15.2)|IVA21(15.2)|IVA105(15.2)|Total(15.2)
 */

function pad(s: string | number, len: number, right = false): string {
  const str = String(s);
  return right ? str.padEnd(len).slice(0, len) : str.padStart(len).slice(0, len);
}

function fmtDate(iso: string): string {
  return iso.replace(/-/g, "").slice(0, 8);
}

function fmtAmount(n: number): string {
  return n.toFixed(2).replace(".", "").padStart(15, "0");
}

const TYPE_CODE: Record<string, string> = {
  A: "001", B: "006", C: "011", M: "051", E: "019",
};

export interface CitiSalesRecord {
  issueDate: string; invoiceType: string; pointOfSale: number; number: number;
  buyerCuit?: string; netAmount: number; vat21: number; vat105: number;
  vat27: number; exempt: number; total: number;
}

export interface CitiPurchaseRecord extends CitiSalesRecord {
  supplierCuit: string;
}

export function buildCitiSalesTxt(rows: CitiSalesRecord[]): Blob {
  const lines = rows.map((r) =>
    [
      fmtDate(r.issueDate),
      TYPE_CODE[r.invoiceType] ?? "000",
      pad(r.pointOfSale, 5),
      pad(r.number, 8),
      pad((r.buyerCuit ?? "").replace(/\D/g, ""), 11),
      fmtAmount(r.netAmount),
      fmtAmount(r.vat21),
      fmtAmount(r.vat105),
      fmtAmount(r.vat27),
      fmtAmount(r.exempt),
      fmtAmount(r.total),
    ].join("|"),
  );
  return new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
}

export function buildCitiPurchasesTxt(rows: CitiPurchaseRecord[]): Blob {
  const lines = rows.map((r) =>
    [
      fmtDate(r.issueDate),
      TYPE_CODE[r.invoiceType] ?? "000",
      pad(r.pointOfSale, 5),
      pad(r.number, 8),
      pad(r.supplierCuit.replace(/\D/g, ""), 11),
      fmtAmount(r.netAmount),
      fmtAmount(r.vat21),
      fmtAmount(r.vat105),
      fmtAmount(r.vat27),
      fmtAmount(r.exempt),
      fmtAmount(r.total),
    ].join("|"),
  );
  return new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
}
