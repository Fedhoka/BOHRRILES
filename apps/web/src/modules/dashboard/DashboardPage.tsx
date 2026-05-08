import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuthStore } from "../../store/auth.js";
import { currency } from "../../lib/fmt.js";
import TrafficLight from "../studio/TrafficLight.js";

interface VatReturn { period: string; payable: number; technicalBalanceNext: number }
interface ChecklistRun { status: string; items: { done: boolean }[] }

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { user, clients, activeClientId } = useAuthStore();
  const client = clients.find((c) => c.clientId === activeClientId);
  const [latestVat, setLatestVat] = useState<VatReturn | null>(null);
  const [checklists, setChecklists] = useState<ChecklistRun[]>([]);
  const period = currentPeriod();

  useEffect(() => {
    if (!activeClientId) return;
    Promise.all([
      api.get<VatReturn[]>("/vat-returns/history").catch(() => ({ data: [] as VatReturn[] })),
      api.get<ChecklistRun[]>("/checklists", { params: { period } }).catch(() => ({ data: [] as ChecklistRun[] })),
    ]).then(([vat, chk]) => {
      const hist = vat.data;
      setLatestVat(hist.at(-1) ?? null);
      setChecklists(chk.data);
    });
  }, [activeClientId, period]);

  const totalItems = checklists.reduce((a, c) => a + c.items.length, 0);
  const doneItems = checklists.reduce((a, c) => a + c.items.filter((i) => i.done).length, 0);
  const allDone = totalItems > 0 && doneItems === totalItems;

  const Kpi = ({ label, value, sub, to }: { label: string; value: string; sub?: string; to: string }) => (
    <Link to={to} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </Link>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Buen día{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        {client && <p className="text-sm text-slate-400 mt-0.5">{client.legalName} · {period}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi
          label="IVA último período cerrado"
          value={latestVat ? currency(latestVat.payable) : "—"}
          sub={latestVat ? `Período ${latestVat.period}` : "Sin períodos cerrados"}
          to="/vat"
        />
        <Kpi
          label="Saldo técnico acumulado"
          value={latestVat ? currency(latestVat.technicalBalanceNext) : "—"}
          sub="A favor del contribuyente"
          to="/vat"
        />
        <Link to="/studio" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
          <p className="text-xs text-slate-500 mb-1">Checklist {period}</p>
          <div className="flex items-center gap-2 mt-1">
            <TrafficLight status={totalItems === 0 ? "none" : allDone ? "done" : doneItems > 0 ? "in_progress" : "pending"} />
            <span className="text-2xl font-bold text-slate-800">{totalItems > 0 ? `${doneItems}/${totalItems}` : "—"}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">ítems completados</p>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {[
          { to: "/vat", icon: "%", label: "IVA", desc: "Facturas, liquidación y CITI" },
          { to: "/payroll", icon: "₿", label: "Sueldos", desc: "Empleados y liquidaciones" },
          { to: "/annual", icon: "📊", label: "Anual", desc: "Dashboard, proyección y calendario" },
          { to: "/exports", icon: "↓", label: "Exportar", desc: "PDF, Excel y archivos AFIP" },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <span className="text-2xl w-10 text-center">{item.icon}</span>
            <div>
              <p className="font-semibold text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
