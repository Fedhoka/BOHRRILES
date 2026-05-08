import { useState } from "react";
import Badge from "../../components/ui/Badge.js";
import TrafficLight from "./TrafficLight.js";
import type { ClientSummary, ChecklistRun } from "./hooks/useStudioData.js";

interface Props {
  clients: ClientSummary[];
  checklistsByClient: Map<string, ChecklistRun[]>;
  search: string;
  statusFilter: "all" | "done" | "pending" | "blocked";
  onSelectClient: (id: string) => void;
}

const TAX_LABEL: Record<string, string> = {
  responsable_inscripto: "R.I.",
  monotributista: "Mono",
  exento: "Exento",
  consumidor_final: "C.F.",
};

function overallStatus(runs: ChecklistRun[]): "done" | "in_progress" | "pending" | "none" {
  if (!runs.length) return "none";
  if (runs.every((r) => r.status === "done")) return "done";
  if (runs.some((r) => r.status === "in_progress" || r.status === "done")) return "in_progress";
  return "pending";
}

export default function ClientTable({ clients, checklistsByClient, search, statusFilter, onSelectClient }: Props) {
  const filtered = clients.filter((c) => {
    const matchSearch = !search ||
      c.legalName.toLowerCase().includes(search.toLowerCase()) ||
      c.cuit.includes(search);
    const runs = checklistsByClient.get(c.id) ?? [];
    const st = overallStatus(runs);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "done" && st === "done") ||
      (statusFilter === "pending" && (st === "pending" || st === "none")) ||
      (statusFilter === "blocked" && runs.some((r) => r.status === "blocked"));
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-2 text-left">Cliente</th>
            <th className="px-4 py-2 text-left">CUIT</th>
            <th className="px-4 py-2 text-left">Categoría</th>
            <th className="px-4 py-2 text-center">Checklist</th>
            <th className="px-4 py-2 text-center">Estado</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => {
            const runs = checklistsByClient.get(c.id) ?? [];
            const st = overallStatus(runs);
            const totalItems = runs.reduce((a, r) => a + r.items.length, 0);
            const doneItems = runs.reduce((a, r) => a + r.items.filter((i) => i.done).length, 0);
            return (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-800">{c.legalName}</p>
                  <p className="text-xs text-slate-400">{c.role}</p>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{c.cuit}</td>
                <td className="px-4 py-2.5 text-slate-600">{TAX_LABEL[c.taxCategory] ?? c.taxCategory}</td>
                <td className="px-4 py-2.5 text-center">
                  {totalItems > 0 ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.round((doneItems / totalItems) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{doneItems}/{totalItems}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <TrafficLight status={st === "none" ? "none" : st} />
                    <span className="text-xs text-slate-500 capitalize">
                      {st === "none" ? "Sin abrir" : st === "done" ? "Completo" : st === "in_progress" ? "En progreso" : "Pendiente"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => onSelectClient(c.id)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Ver checklist
                  </button>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin clientes que coincidan.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
