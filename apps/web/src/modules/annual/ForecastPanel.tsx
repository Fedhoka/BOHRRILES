import { currency } from "../../lib/fmt.js";
import type { VatReturn } from "./hooks/useAnnualData.js";

interface Props { vatHistory: VatReturn[]; year: number }

export default function ForecastPanel({ vatHistory, year }: Props) {
  const now = new Date();
  const closedMonths = vatHistory.length;
  const remainingMonths = 12 - closedMonths;

  if (closedMonths === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-2">Proyección {year}</h2>
        <p className="text-sm text-slate-400">Sin períodos cerrados para proyectar.</p>
      </div>
    );
  }

  const avgPayable = vatHistory.reduce((a, b) => a + b.payable, 0) / closedMonths;
  const avgDebit = vatHistory.reduce((a, b) => a + b.debitVat, 0) / closedMonths;
  const avgCredit = vatHistory.reduce((a, b) => a + b.creditVat, 0) / closedMonths;

  const projBase = avgPayable * remainingMonths;
  const projLow = projBase * 0.85;
  const projHigh = projBase * 1.15;

  const ytdPayable = vatHistory.reduce((a, b) => a + b.payable, 0);
  const ytdTechnical = vatHistory.at(-1)?.technicalBalanceNext ?? 0;

  const kpi = (label: string, value: number, sub?: string) => (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-800 tabular-nums">{currency(value)}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Proyección IVA {year}</h2>
        <span className="text-xs text-slate-400">{closedMonths} meses cerrados · {remainingMonths} a proyectar</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {kpi("IVA pagado YTD", ytdPayable, `${closedMonths} meses`)}
        {kpi("Saldo técnico actual", ytdTechnical, "A favor del contribuyente")}
        {kpi("Proyección restante (base)", projBase, "Promedio mensual × meses restantes")}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-600 mb-1">Rango proyección ±15%</p>
          <p className="text-sm font-semibold text-blue-800 tabular-nums">{currency(projLow)}</p>
          <p className="text-xs text-blue-500 my-0.5">— a —</p>
          <p className="text-sm font-semibold text-blue-800 tabular-nums">{currency(projHigh)}</p>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Débito prom./mes</p>
          <p className="font-medium tabular-nums">{currency(avgDebit)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Crédito prom./mes</p>
          <p className="font-medium tabular-nums">{currency(avgCredit)}</p>
        </div>
      </div>
    </div>
  );
}
