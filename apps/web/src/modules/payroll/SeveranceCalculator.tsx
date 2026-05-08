import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../lib/api.js";
import { currency } from "../../lib/fmt.js";
import type { Employee } from "./hooks/useEmployees.js";

const Schema = z.object({
  cause: z.enum(["sin_causa", "con_causa", "renuncia", "mutuo_acuerdo", "fallecimiento"]),
  terminationDate: z.string().min(1, "Requerido"),
  vacationDaysAccrued: z.coerce.number().int().min(0).default(0),
});
type Form = z.infer<typeof Schema>;

interface SeveranceResult {
  bestSalary12m: number; yearsForCompensation: number;
  severanceArt245: number; preavisoArt231: number; integracionMes: number;
  sacProporcional: number; vacacionesNoGozadas: number; total: number;
}

const CAUSE_LABELS: Record<string, string> = {
  sin_causa: "Despido sin causa",
  con_causa: "Despido con causa",
  renuncia: "Renuncia",
  mutuo_acuerdo: "Mutuo acuerdo",
  fallecimiento: "Fallecimiento",
};

const inp = "w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default function SeveranceCalculator({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [result, setResult] = useState<SeveranceResult | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { cause: "sin_causa", vacationDaysAccrued: 0 },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const r = await api.get<SeveranceResult>(`/employees/${employee.id}/severance`, { params: data });
      setResult(r.data);
    } finally {
      setLoading(false);
    }
  };

  const ResultRow = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
    <tr className={bold ? "border-t-2 border-slate-200 font-bold" : "border-t border-slate-100"}>
      <td className="py-2 pl-3 text-sm text-slate-700">{label}</td>
      <td className={`py-2 pr-3 text-right tabular-nums text-sm ${bold ? "text-lg" : ""}`}>{currency(value)}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm">
        <p className="font-medium text-slate-800">{employee.lastName}, {employee.firstName}</p>
        <p className="text-slate-500 text-xs">Ingreso: {new Date(employee.hireDate).toLocaleDateString("es-AR")} · {employee.cct} — {employee.category}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Causa de desvinculación" error={errors.cause?.message}>
            <select {...register("cause")} className={inp}>
              {Object.entries(CAUSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Fecha de egreso" error={errors.terminationDate?.message}>
            <input type="date" {...register("terminationDate")} className={inp} />
          </Field>
          <Field label="Días de vacaciones no gozadas">
            <input type="number" {...register("vacationDaysAccrued")} className={inp} min={0} />
          </Field>
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-60">
          {loading ? "Calculando..." : "Calcular liquidación"}
        </button>
      </form>

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase">Detalle de la liquidación final</p>
            <p className="text-xs text-slate-400 mt-0.5">Base: mejor remuneración últimos 12 meses = {currency(result.bestSalary12m)} · {result.yearsForCompensation} años</p>
          </div>
          <table className="w-full">
            <tbody>
              {result.severanceArt245 > 0 && <ResultRow label="Indemnización art. 245 LCT" value={result.severanceArt245} />}
              {result.preavisoArt231 > 0 && <ResultRow label="Preaviso art. 231 LCT" value={result.preavisoArt231} />}
              {result.integracionMes > 0 && <ResultRow label="Integración mes despido art. 233" value={result.integracionMes} />}
              {result.sacProporcional > 0 && <ResultRow label="SAC proporcional" value={result.sacProporcional} />}
              {result.vacacionesNoGozadas > 0 && <ResultRow label="Vacaciones no gozadas" value={result.vacacionesNoGozadas} />}
              <ResultRow label="TOTAL LIQUIDACIÓN" value={result.total} bold />
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cerrar</button>
      </div>
    </div>
  );
}
