import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";
import { cuitEnding } from "@bohr/core";

interface DueSoon {
  period: string;
  due: string;
  daysLeft: number;
}

export default function NotificationBell() {
  const { activeClientId, clients } = useAuthStore();
  const [alerts, setAlerts] = useState<DueSoon[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!activeClientId) return;
    const client = clients.find((c) => c.clientId === activeClientId);
    if (!client) return;

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const period = `${year}-${String(month).padStart(2, "0")}`;

    api.get<{ period: string; due: string }>("/vat-returns/_/due-dates", { params: { period } })
      .then((r) => {
        const due = new Date(r.data.due);
        const diff = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
        if (diff <= 5) setAlerts([{ period, due: due.toLocaleDateString("es-AR"), daysLeft: diff }]);
        else setAlerts([]);
      })
      .catch(() => setAlerts([]));
  }, [activeClientId, clients]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Notificaciones"
      >
        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {alerts.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Alertas</p>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-400">Sin vencimientos próximos</p>
          ) : (
            alerts.map((a) => (
              <div key={a.period} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                <p className="font-medium text-amber-800">IVA {a.period}</p>
                <p className="text-amber-600 text-xs">Vence {a.due} · {a.daysLeft} días</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
