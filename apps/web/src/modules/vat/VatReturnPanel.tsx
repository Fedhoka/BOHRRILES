import { useState } from "react";
import { api } from "../../lib/api.js";
import { currency, percent } from "../../lib/fmt.js";
import type { VatPreview } from "./hooks/useVatData.js";

interface Props {
  period: string;
  preview: VatPreview;
  onClosed: () => void;
}

const Row = ({ label, value, bold, indent }: { label: string; value: string; bold?: boolean; indent?: boolean }) => (
  <tr className={bold ? "font-semibold" : ""}>
    <td className={`py-1.5 text-sm text-slate-700 ${indent ? "pl-6" : "pl-2"}`}>{label}</td>
    <td className="py-1.5 text-sm text-right pr-2 tabular-nums">{value}</td>
  </tr>
);

const Sep = ({ label }: { label: string }) => (
  <tr>
    <td colSpan={2} className="pt-3 pb-1 pl-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</td>
  </tr>
);

export default function VatReturnPanel({ period, preview, onClosed }: Props) {
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const r = preview.result;

  const handleClose = async () => {
    if (!confirm(`¿Cerrar el período ${period}? Esta acción es irreversible.`)) return;
    setClosing(true);
    setError(null);
    try {
      await api.post(`/vat-returns/${period}/close`);
      onClosed();
    } catch {
      setError("Error al cerrar el período. Verificá que no esté ya cerrado.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Determinación IVA — {period}</h3>
        <div className="text-xs text-slate-500">
          {preview.counts.sales} ventas · {preview.counts.purchases} compras
        </div>
      </div>

      <table className="w-full">
        <tbody>
          <Sep label="Débito fiscal" />
          <Row indent label="IVA 21% (ventas)" value={currency(r.detail.debit.vat21)} />
          <Row indent label="IVA 10.5% (ventas)" value={currency(r.detail.debit.vat105)} />
          <Row indent label="IVA 27% (ventas)" value={currency(r.detail.debit.vat27)} />
          <Row bold label="Total débito" value={currency(r.debitVat)} />

          <Sep label="Crédito fiscal" />
          <Row indent label="IVA 21% (compras A/M)" value={currency(r.detail.credit.vat21)} />
          <Row indent label="IVA 10.5% (compras A/M)" value={currency(r.detail.credit.vat105)} />
          <Row indent label="IVA 27% (compras A/M)" value={currency(r.detail.credit.vat27)} />
          <Row indent label="Crédito bruto" value={currency(r.creditVatGross)} />
          {r.proportionalityFactor < 1 && (
            <Row indent label={`Prorrateo (${percent(r.proportionalityFactor)})`} value={currency(r.creditVatAfterProportionality)} />
          )}
          {r.detail.rejectedCredit.length > 0 && (
            <tr>
              <td colSpan={2} className="pl-6 pb-1">
                {r.detail.rejectedCredit.map((rc, i) => (
                  <span key={i} className="inline-block text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 mr-1">
                    {rc.reason}: {currency(rc.amount)}
                  </span>
                ))}
              </td>
            </tr>
          )}
          <Row bold label="Crédito aplicable" value={currency(r.creditVatAfterProportionality)} />

          <Sep label="Saldos técnicos" />
          {preview.previous && (
            <Row indent label={`Saldo técnico anterior (${preview.previous.period})`} value={currency(preview.previous.technicalBalanceNext)} />
          )}
          <Row indent label="Saldo técnico próximo período" value={currency(r.technicalBalanceNext)} />

          <Sep label="Compensaciones" />
          <Row indent label="Retenciones IVA" value={currency(r.withholdingsApplied)} />
          <Row indent label="Percepciones IVA" value={currency(r.perceptionsApplied)} />
          {(preview.previous?.freeBalanceNext ?? 0) > 0 && (
            <Row indent label="Saldo libre disponible anterior" value={currency(preview.previous!.freeBalanceNext)} />
          )}
          {r.freeBalanceNext > 0 && (
            <Row indent label="Saldo libre disponible siguiente" value={currency(r.freeBalanceNext)} />
          )}

          <tr className="border-t-2 border-slate-200">
            <td className="py-3 pl-2 text-base font-bold text-slate-800">A ingresar</td>
            <td className={`py-3 pr-2 text-right text-base font-bold tabular-nums ${r.payable > 0 ? "text-red-600" : "text-green-600"}`}>
              {currency(r.payable)}
            </td>
          </tr>
        </tbody>
      </table>

      {error && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleClose}
          disabled={closing}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
        >
          {closing ? "Cerrando..." : "Cerrar período"}
        </button>
      </div>
    </div>
  );
}
