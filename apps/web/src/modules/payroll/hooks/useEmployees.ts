import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api.js";
import { useAuthStore } from "../../../store/auth.js";

export interface Employee {
  id: string; clientId: string; companyId: string;
  cuil: string; firstName: string; lastName: string;
  hireDate: string; terminationDate?: string;
  cct: string; category: string; baseSalary: number;
  workSchedule: string; active: boolean;
}

export interface Company {
  id: string; clientId: string; name: string; cct?: string;
}

export function useEmployees() {
  const clientId = useAuthStore((s) => s.activeClientId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [e, c] = await Promise.all([
        api.get<Employee[]>("/employees"),
        api.get<Company[]>("/companies"),
      ]);
      setEmployees(e.data);
      setCompanies(c.data);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);
  return { employees, companies, loading, reload: load };
}
