import { useMemo } from "react";
import { currency } from "../../lib/fmt.js";
import type { PayrollRun, Employee } from "./hooks/useAnnualData.js";

interface Props { payrollRuns: PayrollRun[]; employees: Employee[] }

interface EmpCost {
  id: string; name: string; grossTotal: number; netTotal: number;
  deductionsTotal: number; employerTotal: number; artTotal: number;
  periods: number;
}

export default function LaborCostTable({ payrollRuns, employees }: Props) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const costs = useMemo<EmpCost[]>(() => {
    const map = new Map<string, EmpCost>();
    for (const run of payrollRuns) {
      if (!run.snapshot) continue;
      const items = (run.snapshot as unknown as {
        items: Array<{ employeeId: string; grossPay: number; netPay: number; totalDeductions: number; employerContributions: number; art: number }>;
      }).items ?? [];
      for (const item of items) {
        const emp = empMap.get(item.employeeId);
        if (!emp) continue;
        const name = `${emp.lastName}, ${emp.firstName}`;
        const cur = map.get(item.employeeId) ?? {
          id: item.employeeId, name, grossTotal: 0, netTotal: 0,
          deductionsTotal: 0, employerTotal: 0, artTotal: 0, periods: 0,
        };
        cur.grossTotal += item.grossPay;
        cur.netTotal += item.netPay;
        cur.deductionsTotal += item.totalDeductions;
        cur.employerTotal += item.employerContributions;
        cur.artTotal += item.art;
        cur.periods += 1;
        map.set(item.employeeId, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.grossTotal - a.grossTotal);
  }, [payrollRuns, empMap]);

  const totals = useMemo(() => costs.reduce(
    (a, c) => ({
      gross: a.gross + c.grossTotal,
      net: a.net + c.netTotal,
      employer: a.employer + c.employerTotal + c.artTotal,
    }),
    { gross: 0, net: 0, employer: 0 },
  ), [costs]);

  if (!costs.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-2">Costo laboral anual</h2>
        <p className="text-sm text-slate-400">Sin liquidaciones cerradas en el año.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Costo laboral anual por empleado</h2>
        <p className="text-xs text-slate-400 mt-0.5">Incluye haberes brutos + contribuciones patronales</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Empleado</th>
              <th className="px-4 py-2 text-right">Bruto</th>
              <th className="px-4 py-2 text-right">Neto</th>
              <th className="px-4 py-2 text-right">Contrib. pat.</th>
              <th className="px-4 py-2 text-right">Costo total</th>
              <th className="px-4 py-2 text-center">Períodos</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{currency(c.grossTotal)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-green-700">{currency(c.netTotal)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-500">{currency(c.employerTotal + c.artTotal)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold">{currency(c.grossTotal + c.employerTotal + c.artTotal)}</td>
                <td className="px-4 py-2 text-center text-slate-400">{c.periods}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
            <tr>
              <td className="px-4 py-3 text-slate-700">Total</td>
              <td className="px-4 py-3 text-right tabular-nums">{currency(totals.gross)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-green-700">{currency(totals.net)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{currency(totals.employer)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{currency(totals.gross + totals.employer)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
