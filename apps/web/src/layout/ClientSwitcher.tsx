import { useAuthStore } from "../store/auth.js";

export default function ClientSwitcher() {
  const { clients, activeClientId, setActiveClient } = useAuthStore();

  if (clients.length <= 1) {
    const c = clients[0];
    return (
      <div className="px-3 py-2 bg-slate-100 rounded-lg">
        <p className="text-xs text-slate-500">Cliente activo</p>
        <p className="text-sm font-medium text-slate-800 truncate">{c?.legalName ?? "—"}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">Cliente activo</label>
      <select
        value={activeClientId ?? ""}
        onChange={(e) => setActiveClient(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {clients.map((c) => (
          <option key={c.clientId} value={c.clientId}>
            {c.legalName}
          </option>
        ))}
      </select>
    </div>
  );
}
