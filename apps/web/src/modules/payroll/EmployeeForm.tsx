import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { validateCUIT } from "@bohr/core";
import type { Company } from "./hooks/useEmployees.js";

const CCT_OPTIONS = ["130/75", "389/04", "76/75"] as const;

const Schema = z.object({
  companyId: z.string().uuid("Seleccioná una empresa"),
  cuil: z.string().refine(validateCUIT, "CUIL inválido"),
  firstName: z.string().min(1, "Requerido").max(100),
  lastName: z.string().min(1, "Requerido").max(100),
  hireDate: z.string().min(1, "Requerido"),
  cct: z.string().min(1, "Seleccioná CCT"),
  category: z.string().min(1, "Seleccioná categoría"),
  baseSalary: z.coerce.number().positive("Debe ser positivo"),
  workSchedule: z.enum(["full_time", "part_time"]),
});
type Form = z.infer<typeof Schema>;

interface CctScale { category: string; baseSalary: number }

const inp = "w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const Field = ({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

interface Props { companies: Company[]; onSaved: () => void; onCancel: () => void }

export default function EmployeeForm({ companies, onSaved, onCancel }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { workSchedule: "full_time", cct: "", category: "" },
  });

  const selectedCct = watch("cct");
  const [scales, setScales] = useState<CctScale[]>([]);

  useEffect(() => {
    if (!selectedCct) { setScales([]); return; }
    // Usar escalas estáticas del core
    api.get<CctScale[]>("/cct-scales/static")
      .then((r) => {
        const period = new Date().toISOString().slice(0, 7);
        const best = new Map<string, CctScale>();
        for (const s of r.data as (CctScale & { cct: string; period: string })[]) {
          if (s.cct !== selectedCct || s.period > period) continue;
          const existing = best.get(s.category);
          if (!existing || s.period > (existing as CctScale & { period: string }).period) {
            best.set(s.category, s);
          }
        }
        setScales([...best.values()]);
        setValue("category", "");
        setValue("baseSalary", 0);
      })
      .catch(() => setScales([]));
  }, [selectedCct, setValue]);

  const selectedCategory = watch("category");
  useEffect(() => {
    const sc = scales.find((s) => s.category === selectedCategory);
    if (sc) setValue("baseSalary", sc.baseSalary);
  }, [selectedCategory, scales, setValue]);

  const onSubmit = async (data: Form) => {
    await api.post("/employees", data);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Empresa" error={errors.companyId?.message}>
          <select {...register("companyId")} className={inp}>
            <option value="">Seleccioná...</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="CUIL" error={errors.cuil?.message}>
          <input {...register("cuil")} className={inp} placeholder="20-12345678-3" />
        </Field>
        <Field label="Nombre" error={errors.firstName?.message}>
          <input {...register("firstName")} className={inp} />
        </Field>
        <Field label="Apellido" error={errors.lastName?.message}>
          <input {...register("lastName")} className={inp} />
        </Field>
        <Field label="Fecha de ingreso" error={errors.hireDate?.message}>
          <input type="date" {...register("hireDate")} className={inp} />
        </Field>
        <Field label="Jornada">
          <select {...register("workSchedule")} className={inp}>
            <option value="full_time">Completa</option>
            <option value="part_time">Parcial</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="CCT" error={errors.cct?.message}>
          <select {...register("cct")} className={inp}>
            <option value="">Seleccioná...</option>
            {CCT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Categoría" error={errors.category?.message}>
          <select {...register("category")} className={inp} disabled={!scales.length}>
            <option value="">Seleccioná...</option>
            {scales.map((s) => <option key={s.category} value={s.category}>{s.category}</option>)}
          </select>
        </Field>
        <Field label="Salario básico" error={errors.baseSalary?.message}>
          <input type="number" step="0.01" {...register("baseSalary")} className={inp} />
        </Field>
      </div>

      {selectedCct && selectedCategory && scales.length > 0 && (
        <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1">
          Escala CCT {selectedCct} — {selectedCategory}: ${scales.find((s) => s.category === selectedCategory)?.baseSalary?.toLocaleString("es-AR")}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-60">
          {isSubmitting ? "Guardando..." : "Guardar empleado"}
        </button>
      </div>
    </form>
  );
}
