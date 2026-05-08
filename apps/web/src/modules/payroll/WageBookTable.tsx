import { useState } from "react";
import { currency } from "../../lib/fmt.js";
import Badge from "../../components/ui/Badge.js";

interface PayrollRun {
  id: string; period: string; type: string; status: string;
  companyId: string; closedAt?: string;
}
interface PayrollItem {
  employeeId: string; grossPay: number; totalDeductions: number;
  netPay: number; employerContributions: number; art: number;
}

const TYPE_LABELS: Record<string, string> = {
  monthly: "Mensual", bonus_h1: "SAC 1°", bonus_h2: "SAC 2°",
  vacation: "Vacaciones", settlement: "Liquidación",
};

interface Props {
  runs: PayrollRun[];
  employeeNames: Map<string, string>;
  onClose: (id: string) => void;
  onViewWageBook: (id: string) => void;
}

export default function WageBookTable({ runs, employeeNames, onClose, onViewWageBook }: Props) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const filtered = runs.filter(
    (r) => !filter || r.period.includes(filter) || TYPE_LABELS[r.type]?.toLowerCase().includes(filter.toLowerCase()),
  );
  const total = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          placeholder="Filtrar por período o tipo..."
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-xs text-slate-400">{filtered.length} liquidaciones</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Período</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((run) => (
              <tr key={run.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700">{run.period}</td>
                <td className="px-3 py-2 text-slate-600">{TYPE_LABELS[run.type] ?? run.type}</td>
                <td className="px-3 py-2">
                  <Badge
                    label={run.status === "closed" ? "Cerrado" : "Borrador"}
                    variant={run.status === "closed" ? "green" : "amber"}
                  />
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  {run.status === "closed" && (
                    <button
                      onClick={() => onViewWageBook(run.id)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Libro digital
                    </button>
                  )}
                  {run.status === "draft" && (
                    <button
                      onClick={() => onClose(run.id)}
                      className="text-xs text-amber-600 hover:underline"
                    >
                      Cerrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                  Sin liquidaciones. Generá la primera con el botón "Nueva liquidación".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Ant.</button>
          <span className="text-xs text-slate-500">{page + 1} / {total}</span>
          <button disabled={page >= total - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Sig.</button>
        </div>
      )}
    </div>
  );
}
