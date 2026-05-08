import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { api } from "../../lib/api.js";
import { useAuthStore } from "../../store/auth.js";
import PayslipDoc from "./lib/pdf/PayslipDoc.js";
import VatReturnDoc from "./lib/pdf/VatReturnDoc.js";
import { buildSalesBook, buildPurchasesBook } from "./lib/excel/vatBooks.js";
import { buildWageBook } from "./lib/excel/wageBook.js";
import { buildCitiSalesTxt, buildCitiPurchasesTxt } from "./lib/citi/citiTxt.js";
import { triggerDownload, downloadAll } from "./lib/zip/zipDownload.js";

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

interface ExportAction {
  id: string; label: string; desc: string; icon: string;
  fn: () => Promise<void>;
}

export default function ExportsPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { clients, activeClientId } = useAuthStore();
  const client = clients.find((c) => c.clientId === activeClientId);

  const run = async (id: string, fn: () => Promise<void>) => {
    setLoading(id); setDone(null);
    try { await fn(); setDone(id); } finally { setLoading(null); }
  };

  const exportVatPdf = async () => {
    const r = await api.get(`/vat-returns/${period}`);
    const d = r.data as Record<string, number>;
    const blob = await pdf(
      <VatReturnDoc data={{
        clientName: client?.legalName ?? "",
        clientCuit: client?.cuit ?? "",
        period,
        debitVat: d["debitVat"] ?? 0,
        creditVatGross: d["creditVat"] ?? 0,
        proportionalityFactor: d["proportionalityFactor"] ?? 1,
        creditVatAfterProportionality: d["creditVat"] ?? 0,
        technicalBalancePrevious: d["technicalBalancePrevious"] ?? 0,
        technicalBalanceNext: d["technicalBalanceNext"] ?? 0,
        withholdingsApplied: d["withholdingsApplied"] ?? 0,
        perceptionsApplied: d["perceptionsApplied"] ?? 0,
        freeBalancePrevious: d["freeBalancePrevious"] ?? 0,
        freeBalanceNext: d["freeBalanceNext"] ?? 0,
        payable: d["payable"] ?? 0,
        closedAt: d["closedAt"] ? new Date(d["closedAt"]).toLocaleDateString("es-AR") : period,
      }} />
    ).toBlob();
    triggerDownload(blob, `IVA-F731-${period}.pdf`);
  };

  const exportSalesXlsx = async () => {
    const r = await api.get(`/invoices/sales?period=${period}`);
    const blob = buildSalesBook(r.data, period);
    triggerDownload(blob, `LibroVentas-${period}.xlsx`);
  };

  const exportPurchasesXlsx = async () => {
    const r = await api.get(`/invoices/purchases?period=${period}`);
    const blob = buildPurchasesBook(r.data, period);
    triggerDownload(blob, `LibroCompras-${period}.xlsx`);
  };

  const exportCitiSales = async () => {
    const r = await api.get(`/invoices/sales?period=${period}`);
    const blob = buildCitiSalesTxt(r.data);
    triggerDownload(blob, `CITI-Ventas-${period}.txt`);
  };

  const exportCitiPurchases = async () => {
    const r = await api.get(`/invoices/purchases?period=${period}`);
    const blob = buildCitiPurchasesTxt(r.data);
    triggerDownload(blob, `CITI-Compras-${period}.txt`);
  };

  const exportWageBook = async () => {
    const runs = await api.get(`/payroll-runs?period=${period}`);
    const closed = (runs.data as { id: string; status: string }[]).filter((r) => r.status === "closed");
    if (!closed.length) { alert("No hay liquidaciones cerradas en este período."); return; }
    const items = await api.get(`/payroll-runs/${closed[0]!.id}/wage-book`);
    const blob = buildWageBook(items.data, period);
    triggerDownload(blob, `LibroSueldos-${period}.xlsx`);
  };

  const exportAllZip = async () => {
    const [sales, purchases, vatRet] = await Promise.allSettled([
      api.get(`/invoices/sales?period=${period}`),
      api.get(`/invoices/purchases?period=${period}`),
      api.get(`/vat-returns/${period}`),
    ]);

    const entries = [];
    if (sales.status === "fulfilled") {
      entries.push({ filename: `CITI-Ventas-${period}.txt`, blob: buildCitiSalesTxt(sales.value.data) });
      entries.push({ filename: `LibroVentas-${period}.xlsx`, blob: buildSalesBook(sales.value.data, period) });
    }
    if (purchases.status === "fulfilled") {
      entries.push({ filename: `CITI-Compras-${period}.txt`, blob: buildCitiPurchasesTxt(purchases.value.data) });
      entries.push({ filename: `LibroCompras-${period}.xlsx`, blob: buildPurchasesBook(purchases.value.data, period) });
    }
    if (vatRet.status === "fulfilled") {
      const d = vatRet.value.data as Record<string, number>;
      const blob = await pdf(
        <VatReturnDoc data={{
          clientName: client?.legalName ?? "", clientCuit: client?.cuit ?? "", period,
          debitVat: d["debitVat"] ?? 0, creditVatGross: d["creditVat"] ?? 0,
          proportionalityFactor: d["proportionalityFactor"] ?? 1,
          creditVatAfterProportionality: d["creditVat"] ?? 0,
          technicalBalancePrevious: d["technicalBalancePrevious"] ?? 0,
          technicalBalanceNext: d["technicalBalanceNext"] ?? 0,
          withholdingsApplied: d["withholdingsApplied"] ?? 0,
          perceptionsApplied: d["perceptionsApplied"] ?? 0,
          freeBalancePrevious: d["freeBalancePrevious"] ?? 0,
          freeBalanceNext: d["freeBalanceNext"] ?? 0,
          payable: d["payable"] ?? 0,
          closedAt: period,
        }} />
      ).toBlob();
      entries.push({ filename: `IVA-F731-${period}.pdf`, blob });
    }
    await downloadAll(entries, `BOHR-${period}.zip`);
  };

  const ACTIONS: ExportAction[] = [
    { id: "vat-pdf", label: "Liquidación IVA (PDF)", desc: "F731 style — período cerrado", icon: "📄", fn: exportVatPdf },
    { id: "sales-xlsx", label: "Libro IVA Ventas (Excel)", desc: "Formato AFIP CITI", icon: "📊", fn: exportSalesXlsx },
    { id: "purchases-xlsx", label: "Libro IVA Compras (Excel)", desc: "Formato AFIP CITI", icon: "📊", fn: exportPurchasesXlsx },
    { id: "citi-sales", label: "CITI Ventas (TXT)", desc: "RG 3685 pipe-delimitado", icon: "📋", fn: exportCitiSales },
    { id: "citi-purchases", label: "CITI Compras (TXT)", desc: "RG 3685 pipe-delimitado", icon: "📋", fn: exportCitiPurchases },
    { id: "wage-book", label: "Libro de Sueldos (Excel)", desc: "LCT art. 52 — liquidación cerrada", icon: "📊", fn: exportWageBook },
    { id: "zip-all", label: "Todo el período (ZIP)", desc: "Todos los archivos en un clic", icon: "📦", fn: exportAllZip },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Exportar</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Período</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {client && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600">
          Cliente: <span className="font-semibold text-slate-800">{client.legalName}</span>
          <span className="text-slate-400 ml-2">CUIT {client.cuit}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {ACTIONS.map((a) => (
          <div
            key={a.id}
            className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <p className="font-medium text-slate-800">{a.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{a.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {done === a.id && <span className="text-green-500 text-xs">✓ Descargado</span>}
              <button
                onClick={() => run(a.id, a.fn)}
                disabled={loading === a.id}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  a.id === "zip-all"
                    ? "bg-brand-600 hover:bg-brand-700 text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                } disabled:opacity-50`}
              >
                {loading === a.id ? "Generando..." : "Descargar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
