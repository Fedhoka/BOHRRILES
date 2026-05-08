import { useState } from "react";
import { currency, date } from "../../lib/fmt.js";
import Modal from "../../components/ui/Modal.js";
import Badge from "../../components/ui/Badge.js";
import InvoiceForm from "./InvoiceForm.js";
import CitiImport from "./CitiImport.js";
import VatReturnPanel from "./VatReturnPanel.js";
import VatHistory from "./VatHistory.js";
import DueDateBanner from "./DueDateBanner.js";
import { useVatData } from "./hooks/useVatData.js";

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

type Modal_ = "sale" | "purchase" | "import-sales" | "import-purchases" | null;

export default function VatPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [modal, setModal] = useState<Modal_>(null);
  const [tab, setTab] = useState<"ventas" | "compras" | "liquidacion" | "historico">("ventas");
  const { sales, purchases, preview, loading, error, reload } = useVatData(period);

  const tabs = ["ventas", "compras", "liquidacion", "historico"] as const;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">IVA</h1>
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

      <DueDateBanner period={period} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${
              tab === t ? "border-brand-600 text-brand-700 font-medium" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "liquidacion" ? "Liquidación" : t === "historico" ? "Histórico" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-400 text-sm">Cargando...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Ventas */}
      {tab === "ventas" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setModal("sale")} className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
              + Nueva venta
            </button>
            <button onClick={() => setModal("import-sales")} className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
              Importar CITI
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Nro</th>
                  <th className="px-3 py-2 text-left">Comprador</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600">{date(s.issueDate)}</td>
                    <td className="px-3 py-2"><Badge label={s.invoiceType} variant={s.invoiceType === "A" || s.invoiceType === "M" ? "blue" : "slate"} /></td>
                    <td className="px-3 py-2 text-slate-500">{String(s.pointOfSale).padStart(4,"0")}-{String(s.number).padStart(8,"0")}</td>
                    <td className="px-3 py-2 text-slate-600 truncate max-w-[180px]">{s.buyerName ?? s.buyerCuit ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{currency(s.netAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{currency(s.vat21 + s.vat105 + s.vat27)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{currency(s.total)}</td>
                  </tr>
                ))}
                {!loading && sales.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Sin ventas en este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compras */}
      {tab === "compras" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setModal("purchase")} className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
              + Nueva compra
            </button>
            <button onClick={() => setModal("import-purchases")} className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
              Importar CITI
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Proveedor</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">CF</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600">{date(p.issueDate)}</td>
                    <td className="px-3 py-2"><Badge label={p.invoiceType} variant={p.grantsCredit ? "green" : "slate"} /></td>
                    <td className="px-3 py-2 text-slate-600 truncate max-w-[180px]">{p.supplierName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{currency(p.netAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{currency(p.vat21 + p.vat105 + p.vat27)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{currency(p.total)}</td>
                    <td className="px-3 py-2 text-center">
                      {p.isPayroll ? <Badge label="Sueldo" variant="amber" /> : p.grantsCredit ? <Badge label="Sí" variant="green" /> : <Badge label="No" variant="red" />}
                    </td>
                  </tr>
                ))}
                {!loading && purchases.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Sin compras en este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Liquidación */}
      {tab === "liquidacion" && preview && (
        <VatReturnPanel period={period} preview={preview} onClosed={reload} />
      )}

      {/* Histórico */}
      {tab === "historico" && <VatHistory />}

      {/* Modales */}
      <Modal open={modal === "sale"} onClose={() => setModal(null)} title="Nueva factura de venta">
        <InvoiceForm mode="sales" defaultPeriod={period} onSaved={() => { setModal(null); reload(); }} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "purchase"} onClose={() => setModal(null)} title="Nueva factura de compra">
        <InvoiceForm mode="purchases" defaultPeriod={period} onSaved={() => { setModal(null); reload(); }} onCancel={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "import-sales"} onClose={() => setModal(null)} title="Importar CITI Ventas">
        <CitiImport mode="sales" onImported={() => { setModal(null); reload(); }} />
      </Modal>
      <Modal open={modal === "import-purchases"} onClose={() => setModal(null)} title="Importar CITI Compras">
        <CitiImport mode="purchases" onImported={() => { setModal(null); reload(); }} />
      </Modal>
    </div>
  );
}
