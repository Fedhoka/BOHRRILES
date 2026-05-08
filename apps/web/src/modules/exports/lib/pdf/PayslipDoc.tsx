import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 32, color: "#1e293b" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 10 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
  sub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  section: { marginTop: 12 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" },
  label: { flex: 1, color: "#334155" },
  amount: { width: 90, textAlign: "right", fontFamily: "Helvetica", color: "#0f172a" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, marginTop: 4, borderTopWidth: 1.5, borderTopColor: "#1d4ed8" },
  totalLabel: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 10 },
  totalAmount: { width: 90, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 10, color: "#1d4ed8" },
  footer: { marginTop: 20, fontSize: 7.5, color: "#94a3b8", textAlign: "center" },
  grid2: { flexDirection: "row", gap: 16 },
  cell: { flex: 1 },
  cellLabel: { fontSize: 7.5, color: "#64748b", marginBottom: 2 },
  cellValue: { fontFamily: "Helvetica-Bold" },
});

const ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const fmt = (v: number) => ARS.format(v);

export interface PayslipData {
  employer: { name: string; cuit: string; address?: string };
  employee: { fullName: string; cuil: string; category: string; cct: string; hireDate: string };
  period: string;
  earnings: {
    basicSalary: number; overtime50: number; overtime100: number;
    seniority: number; presenteeism: number; productivity: number;
    vacationPay: number; bonusPay: number; nonRemunerative: number;
  };
  deductions: {
    jubilacion: number; obraSocial: number; ley19032: number;
    unionFee: number; incomeTax4th: number; otherDeductions: number;
  };
  grossPay: number; totalDeductions: number; netPay: number;
}

const Row = ({ label, amount }: { label: string; amount: number }) =>
  amount === 0 ? null : (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.amount}>{fmt(amount)}</Text>
    </View>
  );

export default function PayslipDoc({ data }: { data: PayslipData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>{data.employer.name}</Text>
            <Text style={s.sub}>CUIT {data.employer.cuit}</Text>
            {data.employer.address && <Text style={s.sub}>{data.employer.address}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>RECIBO DE SUELDO</Text>
            <Text style={s.sub}>Período {data.period}</Text>
            <Text style={s.sub}>LCT art. 140</Text>
          </View>
        </View>

        {/* Employee data */}
        <View style={s.grid2}>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Apellido y Nombre</Text>
            <Text style={s.cellValue}>{data.employee.fullName}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellLabel}>CUIL</Text>
            <Text style={s.cellValue}>{data.employee.cuil}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Categoría / CCT</Text>
            <Text style={s.cellValue}>{data.employee.category} · {data.employee.cct}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Fecha de ingreso</Text>
            <Text style={s.cellValue}>{data.employee.hireDate}</Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Haberes remunerativos</Text>
          <Row label="Sueldo básico" amount={data.earnings.basicSalary} />
          <Row label="Horas extras 50%" amount={data.earnings.overtime50} />
          <Row label="Horas extras 100%" amount={data.earnings.overtime100} />
          <Row label="Antigüedad" amount={data.earnings.seniority} />
          <Row label="Premio presentismo" amount={data.earnings.presenteeism} />
          <Row label="Premio productividad" amount={data.earnings.productivity} />
          <Row label="Licencia / Vacaciones" amount={data.earnings.vacationPay} />
          <Row label="SAC" amount={data.earnings.bonusPay} />
        </View>

        {data.earnings.nonRemunerative > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>No remunerativos</Text>
            <Row label="Asignaciones no remunerativas" amount={data.earnings.nonRemunerative} />
          </View>
        )}

        {/* Deductions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Deducciones</Text>
          <Row label="Aporte jubilatorio (11%)" amount={data.deductions.jubilacion} />
          <Row label="Obra Social (3%)" amount={data.deductions.obraSocial} />
          <Row label="Ley 19.032 PAMI (3%)" amount={data.deductions.ley19032} />
          <Row label="Cuota sindical" amount={data.deductions.unionFee} />
          <Row label="Imp. Ganancias 4ta categoría" amount={data.deductions.incomeTax4th} />
          <Row label="Otras deducciones" amount={data.deductions.otherDeductions} />
        </View>

        {/* Totals */}
        <View style={{ marginTop: 12 }}>
          <View style={s.row}>
            <Text style={s.label}>Total haberes brutos</Text>
            <Text style={s.amount}>{fmt(data.grossPay)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Total deducciones</Text>
            <Text style={s.amount}>{fmt(data.totalDeductions)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>NETO A COBRAR</Text>
            <Text style={s.totalAmount}>{fmt(data.netPay)}</Text>
          </View>
        </View>

        <Text style={s.footer}>
          Conforme art. 140 LCT. La firma del trabajador acredita recepción del importe, no implica renuncia de derechos.
        </Text>
      </Page>
    </Document>
  );
}
