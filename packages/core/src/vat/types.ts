import { z } from "zod";

export const InvoiceTypeSchema = z.enum(["A", "B", "C", "M", "E"]);
export type InvoiceType = z.infer<typeof InvoiceTypeSchema>;

export const VatInvoiceSchema = z.object({
  id: z.string(),
  invoiceType: InvoiceTypeSchema,
  netAmount: z.number().nonnegative(),
  vat21: z.number().nonnegative().default(0),
  vat105: z.number().nonnegative().default(0),
  vat27: z.number().nonnegative().default(0),
  exempt: z.number().nonnegative().default(0),
  // Whether the line is a salary/payroll cost (does NOT generate ITC even if the
  // formal document type would otherwise allow it)
  isPayroll: z.boolean().default(false),
  // Whether the activity it's allocated to is taxed (true) or exempt (false)
  taxedActivity: z.boolean().default(true),
});
export type VatInvoice = z.infer<typeof VatInvoiceSchema>;

export const WithholdingSchema = z.object({
  id: z.string(),
  taxType: z.enum(["iva", "ganancias", "iibb", "suss"]),
  amount: z.number().nonnegative(),
});
export type Withholding = z.infer<typeof WithholdingSchema>;

export const PerceptionSchema = z.object({
  id: z.string(),
  taxType: z.enum(["iva", "iibb", "ganancias"]),
  amount: z.number().nonnegative(),
});
export type Perception = z.infer<typeof PerceptionSchema>;

export interface VatReturnInput {
  sales: VatInvoice[];
  purchases: VatInvoice[];
  withholdings: Withholding[];
  perceptions: Perception[];
  /** Saldo técnico a favor del contribuyente, traído del período anterior. */
  technicalBalancePrevious: number;
  /** Saldo de libre disponibilidad (retenciones/percepciones acumuladas). */
  freeBalancePrevious: number;
}

export interface VatReturnResult {
  debitVat: number;
  creditVatGross: number;
  proportionalityFactor: number;
  creditVatAfterProportionality: number;
  /** débito - crédito (no puede ser negativo aquí; si es negativo, se vuelve técnico). */
  technicalBalanceCurrent: number;
  /** Saldo técnico que pasa al período siguiente (acumulado). */
  technicalBalanceNext: number;
  withholdingsApplied: number;
  perceptionsApplied: number;
  /** Saldo de libre disponibilidad que pasa al siguiente período. */
  freeBalanceNext: number;
  /** Importe a pagar en el período (≥ 0). */
  payable: number;
  detail: {
    debit: { vat21: number; vat105: number; vat27: number };
    credit: { vat21: number; vat105: number; vat27: number };
    rejectedCredit: { reason: string; amount: number }[];
  };
}
