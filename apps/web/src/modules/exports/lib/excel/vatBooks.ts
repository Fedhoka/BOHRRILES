import * as XLSX from "xlsx";

export interface SalesRow {
  period: string; issueDate: string; invoiceType: string;
  pointOfSale: number; number: number; buyerCuit?: string; buyerName?: string;
  netAmount: number; vat21: number; vat105: number; vat27: number;
  vatPerceptions: number; iibbPerceptions: number; exempt: number; total: number;
}

export interface PurchaseRow extends SalesRow {
  supplierCuit: string; supplierName: string;
  grantsCredit: boolean; isPayroll: boolean;
}

/** Libro IVA Ventas — columnas AFIP CITI RG 3685 */
export function buildSalesBook(rows: SalesRow[], period: string): Blob {
  const headers = [
    "Fecha","Tipo","Pto.Venta","Número","CUIT Comprador","Nombre",
    "Neto Gravado","IVA 21%","IVA 10.5%","IVA 27%",
    "Perc. IVA","Perc. IIBB","Exento","Total",
  ];
  const data = rows.map((r) => [
    r.issueDate, r.invoiceType, r.pointOfSale, r.number,
    r.buyerCuit ?? "", r.buyerName ?? "",
    r.netAmount, r.vat21, r.vat105, r.vat27,
    r.vatPerceptions, r.iibbPerceptions, r.exempt, r.total,
  ]);
  return toBlob([headers, ...data], `IVA Ventas ${period}`);
}

/** Libro IVA Compras — columnas AFIP CITI RG 3685 */
export function buildPurchasesBook(rows: PurchaseRow[], period: string): Blob {
  const headers = [
    "Fecha","Tipo","Pto.Venta","Número","CUIT Proveedor","Proveedor",
    "Neto Gravado","IVA 21%","IVA 10.5%","IVA 27%",
    "Perc. IVA","Perc. IIBB","Exento","Total","Cred.Fiscal","Personal",
  ];
  const data = rows.map((r) => [
    r.issueDate, r.invoiceType, r.pointOfSale, r.number,
    r.supplierCuit, r.supplierName,
    r.netAmount, r.vat21, r.vat105, r.vat27,
    r.vatPerceptions, r.iibbPerceptions, r.exempt, r.total,
    r.grantsCredit ? "SI" : "NO", r.isPayroll ? "SI" : "NO",
  ]);
  return toBlob([headers, ...data], `IVA Compras ${period}`);
}

function toBlob(matrix: unknown[][], sheetName: string): Blob {
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  // Format numeric columns
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let R = 1; R <= range.e.r; R++) {
    for (let C = 6; C <= 13; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr] && typeof ws[addr].v === "number") {
        ws[addr].t = "n";
        ws[addr].z = '#,##0.00';
      }
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
