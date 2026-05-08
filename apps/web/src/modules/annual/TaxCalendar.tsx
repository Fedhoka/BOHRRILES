import { useMemo } from "react";
import { useAuthStore } from "../../store/auth.js";
import { cuitEnding } from "@bohr/core";

interface Deadline {
  period: string; label: string; type: "iva" | "payroll" | "suss";
  due: Date; daysLeft: number;
}

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function vatDueDay(cuit: string): number {
  const d = cuitEnding(cuit);
  return 18 + Math.floor(d / 2);
}

interface Props { year: number }

export default function TaxCalendar({ year }: Props) {
  const { clients, activeClientId } = useAuthStore();
  const client = clients.find((c) => c.clientId === activeClientId);

  const deadlines = useMemo<Deadline[]>(() => {
    if (!client) return [];
    const now = Date.now();
    const vatDay = Math.min(vatDueDay(client.cuit), 28);
    const result: Deadline[] = [];

    for (let m = 1; m <= 12; m++) {
      const period = `${year}-${String(m).padStart(2, "0")}`;
      const month = MONTHS[m - 1]!;

      // IVA vence mes siguiente
      const ivaMonth = m === 12 ? 1 : m + 1;
      const ivaYear = m === 12 ? year + 1 : year;
      const ivaDue = new Date(Date.UTC(ivaYear, ivaMonth - 1, vatDay));
      result.push({
        period, label: `IVA ${month}`, type: "iva", due: ivaDue,
        daysLeft: Math.ceil((ivaDue.getTime() - now) / 86_400_000),
      });

      // F931 SUSS — día 10 del mes siguiente (simplificado)
      const sussMonth = m === 12 ? 1 : m + 1;
      const sussYear = m === 12 ? year + 1 : year;
      const sussDue = new Date(Date.UTC(sussYear, sussMonth - 1, 10));
      result.push({
        period, label: `F931 SUSS ${month}`, type: "suss", due: sussDue,
        daysLeft: Math.ceil((sussDue.getTime() - now) / 86_400_000),
      });
    }

    // SAC (dos por año)
    const sac1 = new Date(Date.UTC(year, 5, 30)); // 30 jun
    const sac2 = new Date(Date.UTC(year, 11, 31)); // 31 dic
    result.push({ period: `${year}-06`, label: "SAC 1er semestre", type: "payroll", due: sac1, daysLeft: Math.ceil((sac1.getTime() - now) / 86_400_000) });
    result.push({ period: `${year}-12`, label: "SAC 2do semestre", type: "payroll", due: sac2, daysLeft: Math.ceil((sac2.getTime() - now) / 86_400_000) });

    return result.sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [client, year]);

  const handleExport = () => {
    const lines = ["Tipo,Período,Etiqueta,Vencimiento,Días restantes"];
    for (const d of deadlines) {
      lines.push(`${d.type},${d.period},"${d.label}",${d.due.toLocaleDateString("es-AR")},${d.daysLeft}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `calendario-fiscal-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const typeColor = { iva: "blue", payroll: "green", suss: "amber" } as const;
  const typeLabel = { iva: "IVA", payroll: "Sueldos", suss: "SUSS" };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Calendario fiscal {year}</h2>
        <button onClick={handleExport} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
          Exportar CSV
        </button>
      </div>
      <div className="overflow-auto max-h-96">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left">Obligación</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Vencimiento</th>
              <th className="px-4 py-2 text-right">Días</th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map((d, i) => {
              const urgent = d.daysLeft >= 0 && d.daysLeft <= 5;
              const past = d.daysLeft < 0;
              return (
                <tr key={i} className={`border-t border-slate-100 ${urgent ? "bg-amber-50" : past ? "bg-slate-50 opacity-60" : ""}`}>
                  <td className="px-4 py-2 text-slate-700">{d.label}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      d.type === "iva" ? "bg-blue-100 text-blue-700" :
                      d.type === "suss" ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {typeLabel[d.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{d.due.toLocaleDateString("es-AR")}</td>
                  <td className={`px-4 py-2 text-right font-medium tabular-nums ${
                    past ? "text-slate-400" : urgent ? "text-amber-600" : "text-slate-600"
                  }`}>
                    {past ? "Vencido" : `${d.daysLeft}d`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
