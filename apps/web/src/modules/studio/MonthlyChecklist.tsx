import { useState } from "react";
import { api } from "../../lib/api.js";
import { useAuthStore } from "../../store/auth.js";
import TrafficLight from "./TrafficLight.js";
import type { ChecklistRun, ChecklistItem, ChecklistTemplate } from "./hooks/useStudioData.js";

interface Props {
  period: string;
  run: ChecklistRun | undefined;
  template: ChecklistTemplate;
  onUpdated: () => void;
}

export default function MonthlyChecklist({ period, run, template, onUpdated }: Props) {
  const { setActiveClient } = useAuthStore();
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post("/checklists", { templateId: template.id, period });
      onUpdated();
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    if (!run) return;
    setToggling(item.key);
    try {
      await api.patch(`/checklists/${run.id}/items/${item.key}`, { done: !item.done });
      onUpdated();
    } finally {
      setToggling(null);
    }
  };

  const items: ChecklistItem[] = run
    ? (run.items as ChecklistItem[])
    : template.items.map((i) => ({ ...i, done: false }));

  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">{template.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{period} · {doneCount}/{items.length} completados</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
        </div>
      </div>

      {!run ? (
        <div className="px-4 py-4 text-center">
          <p className="text-sm text-slate-400 mb-3">Checklist no iniciado para este período.</p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-60"
          >
            {creating ? "Abriendo..." : "Abrir checklist"}
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li
              key={item.key}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors ${item.done ? "opacity-70" : ""}`}
            >
              <button
                onClick={() => handleToggle(item)}
                disabled={toggling === item.key}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-none transition-colors ${
                  item.done
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-slate-300 hover:border-brand-400"
                }`}
              >
                {item.done && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </button>
              <span className={`text-sm flex-1 ${item.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                {item.label}
              </span>
              {item.doneAt && (
                <span className="text-xs text-slate-400">
                  {new Date(item.doneAt).toLocaleDateString("es-AR")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
