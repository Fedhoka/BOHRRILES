interface Props {
  value: string;
  onChange: (v: string) => void;
  statusFilter: "all" | "done" | "pending" | "blocked";
  onStatusChange: (v: "all" | "done" | "pending" | "blocked") => void;
  period: string;
  onPeriodChange: (v: string) => void;
}

const STATUS_OPTS = [
  { value: "all", label: "Todos" },
  { value: "done", label: "Completos" },
  { value: "pending", label: "Pendientes" },
  { value: "blocked", label: "Bloqueados" },
] as const;

export default function GlobalSearch({ value, onChange, statusFilter, onStatusChange, period, onPeriodChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar cliente o CUIT..."
          className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex border border-slate-200 rounded-lg overflow-hidden text-sm">
        {STATUS_OPTS.map((o) => (
          <button
            key={o.value}
            onClick={() => onStatusChange(o.value)}
            className={`px-3 py-1.5 transition-colors ${
              statusFilter === o.value ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500">Período</label>
        <input
          type="month"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </div>
  );
}
