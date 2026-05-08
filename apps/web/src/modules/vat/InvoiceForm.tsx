import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { api } from "../../lib/api.js";
import { validateCUIT } from "@bohr/core";

const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

const BaseSchema = z.object({
  period: z.string().regex(periodRe, "Formato YYYY-MM"),
  issueDate: z.string().min(1, "Requerido"),
  invoiceType: z.enum(["A", "B", "C", "M", "E"]),
  pointOfSale: z.coerce.number().int().min(1).max(99999),
  number: z.coerce.number().int().min(1).max(99999999),
  netAmount: z.coerce.number().nonnegative(),
  vat21: z.coerce.number().nonnegative().default(0),
  vat105: z.coerce.number().nonnegative().default(0),
  vat27: z.coerce.number().nonnegative().default(0),
  vatPerceptions: z.coerce.number().nonnegative().default(0),
  iibbPerceptions: z.coerce.number().nonnegative().default(0),
  exempt: z.coerce.number().nonnegative().default(0),
  total: z.coerce.number().nonnegative(),
});

const SalesSchema = BaseSchema.extend({
  buyerCuit: z.string().optional(),
  buyerName: z.string().max(200).optional(),
});

const PurchaseSchema = BaseSchema.extend({
  supplierCuit: z.string().refine(validateCUIT, "CUIT inválido"),
  supplierName: z.string().min(1).max(200),
  isPayroll: z.boolean().default(false),
});

type Mode = "sales" | "purchases";
type SalesForm = z.infer<typeof SalesSchema>;
type PurchaseForm = z.infer<typeof PurchaseSchema>;
type FormData = SalesForm | PurchaseForm;

interface Props {
  mode: Mode;
  defaultPeriod: string;
  onSaved: () => void;
  onCancel: () => void;
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const inp = "w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function InvoiceForm({ mode, defaultPeriod, onSaved, onCancel }: Props) {
  const schema = mode === "sales" ? SalesSchema : PurchaseSchema;
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema as z.ZodSchema<FormData>),
    defaultValues: { period: defaultPeriod, invoiceType: "A", vat21: 0, vat105: 0, vat27: 0 } as FormData,
  });

  const net = watch("netAmount") ?? 0;
  const v21 = watch("vat21") ?? 0;
  const v105 = watch("vat105") ?? 0;
  const v27 = watch("vat27") ?? 0;

  useEffect(() => {
    const t = Number(net) + Number(v21) + Number(v105) + Number(v27);
    if (!isNaN(t)) setValue("total", t);
  }, [net, v21, v105, v27, setValue]);

  const onSubmit = async (data: FormData) => {
    const url = mode === "sales" ? "/invoices/sales" : "/invoices/purchases";
    await api.post(url, data);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Período" error={errors.period?.message}>
          <input {...register("period")} className={inp} placeholder="2026-05" />
        </Field>
        <Field label="Fecha" error={errors.issueDate?.message}>
          <input type="date" {...register("issueDate")} className={inp} />
        </Field>
        <Field label="Tipo" error={errors.invoiceType?.message}>
          <select {...register("invoiceType")} className={inp}>
            {["A","B","C","M","E"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Pto. Venta">
          <input type="number" {...register("pointOfSale")} className={inp} />
        </Field>
        <Field label="Número">
          <input type="number" {...register("number")} className={inp} />
        </Field>
        {mode === "sales" ? (
          <>
            <Field label="CUIT comprador">
              <input {...register("buyerCuit" as keyof FormData)} className={inp} placeholder="20-12345678-3" />
            </Field>
            <Field label="Nombre comprador" error={(errors as Record<string,{message?:string}>)["buyerName"]?.message}>
              <input {...register("buyerName" as keyof FormData)} className={inp} />
            </Field>
          </>
        ) : (
          <>
            <Field label="CUIT proveedor" error={(errors as Record<string,{message?:string}>)["supplierCuit"]?.message}>
              <input {...register("supplierCuit" as keyof FormData)} className={inp} placeholder="20-12345678-3" />
            </Field>
            <Field label="Proveedor" error={(errors as Record<string,{message?:string}>)["supplierName"]?.message}>
              <input {...register("supplierName" as keyof FormData)} className={inp} />
            </Field>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Neto gravado">
          <input type="number" step="0.01" {...register("netAmount")} className={inp} />
        </Field>
        <Field label="IVA 21%">
          <input type="number" step="0.01" {...register("vat21")} className={inp} />
        </Field>
        <Field label="IVA 10.5%">
          <input type="number" step="0.01" {...register("vat105")} className={inp} />
        </Field>
        <Field label="IVA 27%">
          <input type="number" step="0.01" {...register("vat27")} className={inp} />
        </Field>
        <Field label="Exento">
          <input type="number" step="0.01" {...register("exempt")} className={inp} />
        </Field>
        <Field label="Total" error={errors.total?.message}>
          <input type="number" step="0.01" {...register("total")} className={inp} readOnly />
        </Field>
      </div>

      {mode === "purchases" && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register("isPayroll" as keyof FormData)} className="rounded" />
          Gasto de personal (no genera crédito fiscal)
        </label>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-60">
          {isSubmitting ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
