import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api.js";
import { useAuthStore } from "../../../store/auth.js";

export interface ClientSummary {
  id: string; cuit: string; legalName: string; taxCategory: string;
  active: boolean; role: string;
}

export interface ChecklistRun {
  id: string; clientId: string; templateId: string; period: string;
  status: "pending" | "in_progress" | "done" | "blocked";
  items: ChecklistItem[];
}

export interface ChecklistItem {
  key: string; label: string; done: boolean;
  doneAt?: number; doneBy?: string; note?: string;
}

export interface ChecklistTemplate {
  id: string; code: string; name: string;
  items: { key: string; label: string }[];
}

export function useStudioData(period: string) {
  const { activeClientId } = useAuthStore();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRun[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        api.get<ClientSummary[]>("/clients"),
        api.get<ChecklistTemplate[]>("/checklists/templates"),
      ]);
      setClients(c.data);
      setTemplates(t.data);

      // Load checklists for the active client in the selected period
      if (activeClientId) {
        const ch = await api.get<ChecklistRun[]>("/checklists", { params: { period } });
        setChecklists(ch.data);
      }
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [activeClientId, period]);

  useEffect(() => { load(); }, [load]);

  return { clients, checklists, templates, loading, reload: load };
}
