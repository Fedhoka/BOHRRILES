import { useState, useEffect } from "react";
import { api } from "../../lib/api.js";
import Modal from "../../components/ui/Modal.js";
import EmployeeForm from "./EmployeeForm.js";
import PayrollRunForm from "./PayrollRunForm.js";
import SeveranceCalculator from "./SeveranceCalculator.js";
import WageBookTable from "./WageBookTable.js";
import { useEmployees, type Employee } from "./hooks/useEmployees.js";

interface PayrollRun {
  id: string; period: string; type: string; status: string;
  companyId: string; closedAt?: string;
}

type ModalType = "employee" | "run" | "severance" | "wagebook" | null;

export default function PayrollPage() {
  const [tab, setTab] = useState<"employees" | "runs">("runs");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [wageBook, setWageBook] = useState<unknown[] | null>(null);
  const { employees, companies, loading, reload } = useEmployees();

  const loadRuns = async () => {
    const r = await api.get<PayrollRun[]>("/payroll-runs");
    setRuns(r.data);
  };

  useEffect(() => { loadRuns(); }, []);

  const handleCloseRun = async (id: string) => {
    if (!confirm("¿Cerrar esta liquidación? Acción irreversible.")) return;
    await api.post(`/payroll-runs/${id}/close`);
    loadRuns();
  };

  const handleViewWageBook = async (id: string) => {
    const r = await api.get<unknown[]>(`/payroll-runs/${id}/wage-book`);
    setWageBook(r.data);
    setModal("wagebook");
  };

  const empNames = new Map(employees.map((e) => [e.id, `${e.lastName}, ${e.firstName}`]));

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Sueldos</h1>
        <div className="flex gap-2">
          <button onClick={() => setModal("employee")} className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
            + Empleado
          </button>
          <button onClick={() => setModal("run")} className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
            + Nueva liquidación
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(["runs", "employees"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t ? "border-brand-600 text-brand-700 font-medium" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t === "runs" ? "Liquidaciones" : "Empleados"}
          </button>
        ))}
      </div>

      {tab === "runs" && (
        <WageBookTable
          runs={runs}
          employeeNames={empNames}
          onClose={handleCloseRun}
          onViewWageBook={handleViewWageBook}
        />
      )}

      {tab === "employees" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Apellido, Nombre</th>
                <th className="px-3 py-2 text-left">CUIL</th>
                <th className="px-3 py-2 text-left">CCT / Categoría</th>
                <th className="px-3 py-2 text-right">Básico</th>
                <th className="px-3 py-2 text-right">Ingreso</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{e.lastName}, {e.firstName}</td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-xs">{e.cuil}</td>
                  <td className="px-3 py-2 text-slate-600">{e.cct} — {e.category}</td>
                  <td className="px-3 py-2 text-right tabular-nums">${e.baseSalary.toLocaleString("es-AR")}</td>
                  <td className="px-3 py-2 text-right text-slate-500 text-xs">
                    {new Date(e.hireDate).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => { setSelectedEmp(e); setModal("severance"); }}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Liquidar
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && employees.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Sin empleados. Agregá el primero.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal === "employee"} onClose={() => setModal(null)} title="Nuevo empleado">
        <EmployeeForm companies={companies} onSaved={() => { setModal(null); reload(); }} onCancel={() => setModal(null)} />
      </Modal>

      <Modal open={modal === "run"} onClose={() => setModal(null)} title="Nueva liquidación de sueldos" width="max-w-5xl">
        <PayrollRunForm companies={companies} employees={employees} onSaved={() => { setModal(null); loadRuns(); }} onCancel={() => setModal(null)} />
      </Modal>

      <Modal open={modal === "severance" && !!selectedEmp} onClose={() => setModal(null)} title="Calculadora de liquidación final">
        {selectedEmp && <SeveranceCalculator employee={selectedEmp} onClose={() => setModal(null)} />}
      </Modal>

      <Modal open={modal === "wagebook"} onClose={() => setModal(null)} title="Libro digital de sueldos (LCT art. 52)" width="max-w-3xl">
        <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96">
          {JSON.stringify(wageBook, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}
