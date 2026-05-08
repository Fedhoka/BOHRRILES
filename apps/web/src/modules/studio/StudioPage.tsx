import { useState, useEffect, useMemo } from "react";
import { api } from "../../lib/api.js";
import { useAuthStore } from "../../store/auth.js";
import GlobalSearch from "./GlobalSearch.js";
import ClientTable from "./ClientTable.js";
import MonthlyChecklist from "./MonthlyChecklist.js";
import Modal from "../../components/ui/Modal.js";
import { useStudioData } from "./hooks/useStudioData.js";
import type { ChecklistRun } from "./hooks/useStudioData.js";

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export default function StudioPage() {
  const { clients: myClients, setActiveClient, activeClientId } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "pending" | "blocked">("all");
  const [period, setPeriod] = useState(currentPeriod);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientChecklists, setClientChecklists] = useState<Map<string, ChecklistRun[]>>(new Map());

  const { clients, checklists, templates, loading, reload } = useStudioData(period);

  // For the selected client modal: switch context and load their checklists
  const [modalChecklists, setModalChecklists] = useState<ChecklistRun[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  const handleSelectClient = async (id: string) => {
    setSelectedClientId(id);
    setLoadingModal(true);
    setActiveClient(id);
    try {
      const r = await api.get<ChecklistRun[]>("/checklists", { params: { period } });
      setModalChecklists(r.data);
    } catch {
      setModalChecklists([]);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleChecklistUpdated = async () => {
    if (!selectedClientId) return;
    const r = await api.get<ChecklistRun[]>("/checklists", { params: { period } });
    setModalChecklists(r.data);
    reload();
  };

  // Build per-client checklist map for the table
  // In practice each client's checklists are loaded per-context; here we use the current active client's data
  const checklistsByClient = useMemo(() => {
    const m = new Map<string, ChecklistRun[]>();
    if (activeClientId) m.set(activeClientId, checklists);
    return m;
  }, [activeClientId, checklists]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const modalRun = (tpl: { id: string }) => modalChecklists.find((r) => r.templateId === tpl.id);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Dashboard Estudio</h1>
        <span className="text-sm text-slate-400">{clients.length} clientes</span>
      </div>

      <GlobalSearch
        value={search}
        onChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        period={period}
        onPeriodChange={setPeriod}
      />

      {loading && <p className="text-sm text-slate-400">Cargando clientes...</p>}

      <ClientTable
        clients={clients}
        checklistsByClient={checklistsByClient}
        search={search}
        statusFilter={statusFilter}
        onSelectClient={handleSelectClient}
      />

      {/* Checklist view for active client */}
      {checklists.length > 0 || templates.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700">
            Checklists — {myClients.find((c) => c.clientId === activeClientId)?.legalName} · {period}
          </h2>
          {templates.map((tpl) => (
            <MonthlyChecklist
              key={tpl.id}
              period={period}
              run={checklists.find((r) => r.templateId === tpl.id)}
              template={tpl}
              onUpdated={reload}
            />
          ))}
        </div>
      ) : null}

      {/* Per-client modal */}
      <Modal
        open={!!selectedClientId && !!selectedClient}
        onClose={() => setSelectedClientId(null)}
        title={`Checklist — ${selectedClient?.legalName ?? ""} · ${period}`}
        width="max-w-2xl"
      >
        {loadingModal ? (
          <p className="text-slate-400 text-sm">Cargando...</p>
        ) : (
          <div className="space-y-4">
            {templates.map((tpl) => (
              <MonthlyChecklist
                key={tpl.id}
                period={period}
                run={modalRun(tpl)}
                template={tpl}
                onUpdated={handleChecklistUpdated}
              />
            ))}
            {templates.length === 0 && (
              <p className="text-slate-400 text-sm">Sin plantillas de checklist configuradas.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
