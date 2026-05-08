import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../lib/api.js";
import type { Employee, Company } from "./hooks/useEmployees.js";

const ItemSchema = z.object({
  employeeId: z.string().uuid(),
  daysWorked: z.coerce.number().int().min(0).max(31).default(30),
  overtime50Hours: z.coerce.number().min(0).default(0),
  overtime100Hours: z.coerce.number().min(0).default(0),
  presenteeismPct: z.coerce.number().min(0).max(100).default(0),
  productivityBonus: z.coerce.number().min(0).default(0),
  vacationDays: z.coerce.number().int().min(0).max(60).default(0),
  nonRemunerative: z.coerce.number().min(0).default(0),
  unionDuesPct: z.coerce.number().min(0).max(10).default(0),
  otherDeductions: z.coerce.number().min(0).default(0),
  hasSpouse: z.boolean().default(false),
  childrenCount: z.coerce.number().int().min(0).default(0),
  ytdWithheldPriorMonths: z.coerce.number().min(0).default(0),
});

const Schema = z.object({
  companyId: z.string().uuid("Seleccioná empresa"),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato YYYY-MM"),
  type: z.enum(["monthly", "bonus_h1", "bonus_h2", "vacation", "settlement"]),
  items: z.array(ItemSchema).min(1),
});
type Form = z.infer<typeof Schema>;

const TYPE_LABELS: Record<string, string> = {
  monthly: "Mensual", bonus_h1: "SAC 1er semestre", bonus_h2: "SAC 2do semestre",
  vacation: "Vacaciones", settlement: "Liquidación final",
};

const inp = "border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 w-full";
const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

interface Props { companies: Company[]; employees: Employee[]; onSaved: () => void; onCancel: () => void }

export default function PayrollRunForm({ companies, employees, onSaved, onCancel }: Props) {
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: {
      type: "monthly",
      period: new Date().toISOString().slice(0, 7),
      items: [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const selectedCompany = watch("companyId");

  const companyEmployees = employees.filter(
    (e) => e.companyId === selectedCompany && e.active,
  );

  const addAll = () => {
    const existing = new Set(fields.map((f) => f.employeeId));
    for (const e of companyEmployees) {
      if (!existing.has(e.id)) {
        append({
          employeeId: e.id, daysWorked: 30, overtime50Hours: 0, overtime100Hours: 0,
          presenteeismPct: 0, productivityBonus: 0, vacationDays: 0, nonRemunerative: 0,
          unionDuesPct: 0, otherDeductions: 0, hasSpouse: false, childrenCount: 0, ytdWithheldPriorMonths: 0,
        });
      }
    }
  };

  const onSubmit = async (data: Form) => {
    await api.post("/payroll-runs", data);
    onSaved();
  };

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.lastName}, ${e.firstName}` : id;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-4xl">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Empresa" error={errors.companyId?.message}>
          <select {...register("companyId")} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Seleccioná...</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Período" error={errors.period?.message}>
          <input {...register("period")} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </Field>
        <Field label="Tipo" error={errors.type?.message}>
          <select {...register("type")} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500">
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>

      {selectedCompany && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={addAll} className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
            + Agregar todos los empleados ({companyEmployees.length})
          </button>
        </div>
      )}

      {fields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-2 py-2 text-left w-40">Empleado</th>
                <th className="px-2 py-2 text-center">Días</th>
                <th className="px-2 py-2 text-center">HS 50%</th>
                <th className="px-2 py-2 text-center">HS 100%</th>
                <th className="px-2 py-2 text-center">Present.</th>
                <th className="px-2 py-2 text-center">Produc.</th>
                <th className="px-2 py-2 text-center">No rem.</th>
                <th className="px-2 py-2 text-center">Sindicato%</th>
                <th className="px-2 py-2 text-center">Cónyu.</th>
                <th className="px-2 py-2 text-center">Hijos</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => (
                <tr key={field.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-medium text-slate-700 truncate max-w-[160px]">
                    {empName(field.employeeId)}
                    <input type="hidden" {...register(`items.${i}.employeeId`)} />
                  </td>
                  <td className="px-1 py-1"><input type="number" {...register(`items.${i}.daysWorked`)} className={inp} style={{width:48}} /></td>
                  <td className="px-1 py-1"><input type="number" {...register(`items.${i}.overtime50Hours`)} className={inp} style={{width:48}} /></td>
                  <td className="px-1 py-1"><input type="number" {...register(`items.${i}.overtime100Hours`)} className={inp} style={{width:48}} /></td>
                  <td className="px-1 py-1"><input type="number" {...register(`items.${i}.presenteeismPct`)} className={inp} style={{width:48}} /></td>
                  <td className="px-1 py-1"><input type="number" {...register(`items.${i}.productivityBonus`)} className={inp} style={{width:72}} /></td>
                  <td className="px-1 py-1"><input type="number" {...register(`items.${i}.nonRemunerative`)} className={inp} style={{width:72}} /></td>
                  <td className="px-1 py-1"><input type="number" step="0.1" {...register(`items.${i}.unionDuesPct`)} className={inp} style={{width:48}} /></td>
                  <td className="px-1 py-1 text-center"><input type="checkbox" {...register(`items.${i}.hasSpouse`)} /></td>
                  <td className="px-1 py-1"><input type="number" {...register(`items.${i}.childrenCount`)} className={inp} style={{width:40}} /></td>
                  <td className="px-1 py-1">
                    <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-base px-1">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fields.length === 0 && selectedCompany && (
        <p className="text-sm text-slate-400 text-center py-4">Agregá empleados para calcular los recibos.</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        <button type="submit" disabled={isSubmitting || fields.length === 0} className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-60">
          {isSubmitting ? "Calculando..." : "Generar liquidación"}
        </button>
      </div>
    </form>
  );
}
