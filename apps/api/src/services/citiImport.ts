import { z } from "zod";
import { validateCUIT } from "@bohr/core";

/**
 * Parser de CSV simple con manejo de comillas.
 * NO usa eval ni RegExp dinámica con input → seguro.
 */
export function parseCsv(content: string, delimiter = ","): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delimiter) { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); out.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); out.push(cur); }
  return out;
}

const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

const Row = z.object({
  period: z.string().regex(periodRe),
  issueDate: z.coerce.date(),
  invoiceType: z.enum(["A", "B", "C", "M", "E"]),
  pointOfSale: z.coerce.number().int().min(1),
  number: z.coerce.number().int().min(1),
  cuit: z.string().refine(validateCUIT, "invalid_cuit"),
  name: z.string().min(1).max(200),
  netAmount: z.coerce.number().nonnegative(),
  vat21: z.coerce.number().nonnegative().default(0),
  vat105: z.coerce.number().nonnegative().default(0),
  vat27: z.coerce.number().nonnegative().default(0),
  total: z.coerce.number().nonnegative(),
});

export type CitiRow = z.infer<typeof Row>;

export interface CitiImportResult {
  rows: CitiRow[];
  errors: { line: number; message: string }[];
}

/**
 * Importa filas CITI (formato simplificado: cabecera + CSV con campos estándar).
 * En producción soportar CITI RG 3685 (campos posicionales) — aquí versión CSV.
 *
 * Cabeceras esperadas:
 *  period,issueDate,invoiceType,pointOfSale,number,cuit,name,netAmount,vat21,vat105,vat27,total
 */
export function importCitiCsv(content: string): CitiImportResult {
  const matrix = parseCsv(content);
  if (matrix.length === 0) return { rows: [], errors: [{ line: 0, message: "empty_file" }] };
  const header = matrix[0]!.map((h) => h.trim());
  const idx = (k: string) => header.indexOf(k);
  const required = ["period", "issueDate", "invoiceType", "pointOfSale", "number", "cuit", "name", "netAmount", "total"];
  const missing = required.filter((k) => idx(k) === -1);
  if (missing.length) return { rows: [], errors: [{ line: 0, message: `missing_columns:${missing.join(",")}` }] };

  const rows: CitiRow[] = [];
  const errors: { line: number; message: string }[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i]!;
    if (r.every((c) => c === "")) continue;
    const obj = {
      period: r[idx("period")],
      issueDate: r[idx("issueDate")],
      invoiceType: r[idx("invoiceType")],
      pointOfSale: r[idx("pointOfSale")],
      number: r[idx("number")],
      cuit: r[idx("cuit")]?.replace(/[-\s]/g, "") ?? "",
      name: r[idx("name")],
      netAmount: r[idx("netAmount")],
      vat21: idx("vat21") >= 0 ? r[idx("vat21")] : "0",
      vat105: idx("vat105") >= 0 ? r[idx("vat105")] : "0",
      vat27: idx("vat27") >= 0 ? r[idx("vat27")] : "0",
      total: r[idx("total")],
    };
    const parsed = Row.safeParse(obj);
    if (parsed.success) rows.push(parsed.data);
    else errors.push({ line: i + 1, message: parsed.error.issues.map((x) => `${x.path.join(".")}:${x.message}`).join("; ") });
  }
  return { rows, errors };
}
