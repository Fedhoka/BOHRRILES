import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { currency } from "../../lib/fmt.js";
import type { VatReturn } from "./hooks/useAnnualData.js";

interface Props { vatHistory: VatReturn[]; year: number }

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function trafficLight(payable: number, technicalBalance: number): "green" | "amber" | "red" {
  if (technicalBalance > 0) return "green";
  if (payable === 0) return "green";
  if (payable < 500_000) return "amber";
  return "red";
}

export default function VatPositionChart({ vatHistory, year }: Props) {
  const data = Array.from({ length: 12 }, (_, i) => {
    const period = `${year}-${String(i + 1).padStart(2, "0")}`;
    const r = vatHistory.find((v) => v.period === period);
    return {
      month: MONTHS[i],
      "Débito": r?.debitVat ?? 0,
      "Crédito": r?.creditVat ?? 0,
      "A pagar": r?.payable ?? 0,
      "Saldo técnico": r?.technicalBalanceNext ?? 0,
      light: r ? trafficLight(r.payable, r.technicalBalanceNext) : "slate",
      closed: !!r,
    };
  });

  const lightColor = { green: "#22c55e", amber: "#f59e0b", red: "#ef4444", slate: "#cbd5e1" };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Posición IVA {year}</h2>
        <div className="flex gap-3 text-xs">
          {(["green","amber","red"] as const).map((c) => (
            <span key={c} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: lightColor[c] }} />
              {c === "green" ? "Favorable" : c === "amber" ? "Moderado" : "A pagar"}
            </span>
          ))}
        </div>
      </div>

      {/* Traffic lights row */}
      <div className="grid grid-cols-12 gap-1">
        {data.map((d) => (
          <div key={d.month} className="flex flex-col items-center gap-1">
            <div className="w-4 h-4 rounded-full" style={{ background: lightColor[d.light as keyof typeof lightColor] }} />
            <span className="text-xs text-slate-500">{d.month}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => currency(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Débito" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Crédito" stackId="b" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="A pagar" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
