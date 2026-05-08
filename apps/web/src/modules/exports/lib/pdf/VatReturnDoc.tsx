import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 32, color: "#1e293b" },
  header: { borderBottomWidth: 2, borderBottomColor: "#1d4ed8", paddingBottom: 10, marginBottom: 14 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
  sub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" },
  label: { flex: 1, color: "#334155" },
  amount: { width: 110, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 6, borderTopWidth: 2, borderTopColor: "#1d4ed8" },
  totalLabel: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 11 },
  totalAmount: { width: 110, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 11, color: "#dc2626" },
  footer: { marginTop: 20, fontSize: 7.5, color: "#94a3b8" },
});

const ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const fmt = (v: number) => ARS.format(v);

export interface VatReturnDocData {
  clientName: string; clientCuit: string; period: string;
  debitVat: number; creditVatGross: number; proportionalityFactor: number;
  creditVatAfterProportionality: number;
  technicalBalancePrevious: number; technicalBalanceNext: number;
  withholdingsApplied: number; perceptionsApplied: number;
  freeBalancePrevious: number; freeBalanceNext: number;
  payable: number; closedAt: string;
}

const Row = ({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) => (
  <View style={bold ? { ...s.row, borderBottomWidth: 0 } : s.row}>
    <Text style={[s.label, bold ? { fontFamily: "Helvetica-Bold" } : {}]}>{label}</Text>
    <Text style={[s.amount, bold ? { fontFamily: "Helvetica-Bold" } : {}]}>{fmt(amount)}</Text>
  </View>
);

export default function VatReturnDoc({ data }: { data: VatReturnDocData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>LIQUIDACIÓN DE IVA — F731</Text>
          <Text style={s.sub}>{data.clientName} · CUIT {data.clientCuit}</Text>
          <Text style={s.sub}>Período {data.period} · Cerrado el {data.closedAt}</Text>
        </View>

        <Text style={s.sectionTitle}>Débito fiscal</Text>
        <Row label="IVA ventas" amount={data.debitVat} bold />

        <Text style={s.sectionTitle}>Crédito fiscal</Text>
        <Row label="IVA compras (bruto)" amount={data.creditVatGross} />
        {data.proportionalityFactor < 1 && (
          <Row label={`Crédito proporcional (${(data.proportionalityFactor * 100).toFixed(2)}%)`} amount={data.creditVatAfterProportionality} />
        )}
        <Row label="Crédito aplicable" amount={data.creditVatAfterProportionality} bold />

        <Text style={s.sectionTitle}>Saldo técnico</Text>
        {data.technicalBalancePrevious > 0 && (
          <Row label="Saldo técnico período anterior" amount={data.technicalBalancePrevious} />
        )}
        <Row label="Saldo técnico próximo período" amount={data.technicalBalanceNext} />

        <Text style={s.sectionTitle}>Compensaciones</Text>
        {data.withholdingsApplied > 0 && <Row label="Retenciones IVA" amount={data.withholdingsApplied} />}
        {data.perceptionsApplied > 0 && <Row label="Percepciones IVA" amount={data.perceptionsApplied} />}
        {data.freeBalancePrevious > 0 && <Row label="Saldo libre disponible anterior" amount={data.freeBalancePrevious} />}
        {data.freeBalanceNext > 0 && <Row label="Saldo libre disponible siguiente" amount={data.freeBalanceNext} />}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL A INGRESAR</Text>
          <Text style={s.totalAmount}>{fmt(data.payable)}</Text>
        </View>

        <Text style={s.footer}>Generado por BOHR — Sistema de Gestión Tributaria. No reemplaza la presentación oficial en AFIP.</Text>
      </Page>
    </Document>
  );
}
