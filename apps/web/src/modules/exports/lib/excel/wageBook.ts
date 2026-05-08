import * as XLSX from "xlsx";

export interface WageBookRow {
  period: string; cuil: string; fullName: string; category: string; cct: string;
  basicSalary: number; overtime50: number; overtime100: number; seniority: number;
  presenteeism: number; productivity: number; bonusPay: number; vacationPay: number;
  nonRemunerative: number; grossPay: number;
  jubilacion: number; obraSocial: number; ley19032: number;
  unionFee: number; incomeTax4th: number; otherDeductions: number;
  totalDeductions: number; netPay: number;
  employerContributions: number; art: number;
}

/** Libro de sueldos LCT art. 52 — todos los campos requeridos */
export function buildWageBook(rows: WageBookRow[], period: string): Blob {
  const headers = [
    "Período","CUIL","Apellido y Nombre","Categoría","CCT",
    "Básico","HS 50%","HS 100%","Antigüedad","Presentismo","Productividad",
    "SAC","Vacaciones","No Remunerativo","Bruto",
    "Jub. 11%","O.Social 3%","PAMI 3%","Sindicato","Gcias 4ta","Otras Ded.",
    "Total Deducciones","Neto a Cobrar",
    "Contrib. Patronal","ART",
  ];
  const data = rows.map((r) => [
    r.period, r.cuil, r.fullName, r.category, r.cct,
    r.basicSalary, r.overtime50, r.overtime100, r.seniority,
    r.presenteeism, r.productivity, r.bonusPay, r.vacationPay,
    r.nonRemunerative, r.grossPay,
    r.jubilacion, r.obraSocial, r.ley19032, r.unionFee,
    r.incomeTax4th, r.otherDeductions,
    r.totalDeductions, r.netPay,
    r.employerContributions, r.art,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  // Format monetary columns (F=5 through Y=24)
  for (let R = 1; R <= range.e.r; R++) {
    for (let C = 5; C <= 24; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr] && typeof ws[addr].v === "number") {
        ws[addr].t = "n";
        ws[addr].z = '#,##0.00';
      }
    }
  }
  ws["!cols"] = [
    { wch: 8 }, { wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 8 },
    ...Array(20).fill({ wch: 12 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Libro Sueldos ${period}`.slice(0, 31));
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
