import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api.js";
import { useAuthStore } from "../../../store/auth.js";

export interface VatReturn {
  id: string; period: string; debitVat: number; creditVat: number;
  payable: number; technicalBalanceNext: number; freeBalanceNext: number;
  proportionalityFactor: number;
}

export interface PayrollRun {
  id: string; period: string; type: string; status: string; companyId: string;
  snapshot: { totals: { gross: number; net: number; deductions: number; employerContributions: number; art: number } } | null;
}

export interface Employee {
  id: string; firstName: string; lastName: string; companyId: string;
  baseSalary: number; hireDate: string;
}

export function useAnnualData(year: number) {
  const clientId = useAuthStore((s) => s.activeClientId);
  const [vatHistory, setVatHistory] = useState<VatReturn[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [v, p, e] = await Promise.all([
        api.get<VatReturn[]>("/vat-returns/history"),
        api.get<PayrollRun[]>("/payroll-runs"),
        api.get<Employee[]>("/employees"),
      ]);
      const ys = String(year);
      setVatHistory(v.data.filter((x) => x.period.startsWith(ys)));
      setPayrollRuns(p.data.filter((x) => x.period.startsWith(ys) && x.status === "closed"));
      setEmployees(e.data);
    } finally {
      setLoading(false);
    }
  }, [clientId, year]);

  useEffect(() => { load(); }, [load]);
  return { vatHistory, payrollRuns, employees, loading, reload: load };
}
