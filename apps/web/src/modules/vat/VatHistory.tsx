import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { api } from "../../lib/api.js";
import { currency } from "../../lib/fmt.js";

interface VatReturn {
  id: string; period: string; debitVat: number; creditVat: number;
  payable: number; technicalBalanceNext: number;
}

export default function VatHistory() {
  const [history, setHistory] = useState<VatReturn[]>([]);

  useEffect(() => {
    api.get<VatReturn[]>("/vat-returns/history").then((r) => setHistory(r.data.slice(-12))).catch(() => null);
  }, []);

  if (!history.length) return <p className="text-slate-400 text-sm">Sin períodos cerrados.</p>;

  const data = history.map((h) => ({
    period: h.period.slice(5),
    "Débito": h.debitVat,
    "Crédito": h.creditVat,
    "A pagar": h.payable,
    "Saldo técnico": h.technicalBalanceNext,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-4">Histórico IVA — últimos 12 meses</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => currency(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Débito" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Crédito" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="A pagar" stroke="#f59e0b" strokeWidth={2} />
          <Line type="monotone" dataKey="Saldo técnico" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
