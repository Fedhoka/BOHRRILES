import type { InvoiceType, VatInvoice } from "./types.js";

/**
 * Solo facturas tipo A o M habilitan crédito fiscal IVA (RG AFIP).
 * Las facturas B, C, E NO discriminan IVA al comprador → no generan crédito.
 */
export const grantsInputTaxCredit = (t: InvoiceType): boolean =>
  t === "A" || t === "M";

/**
 * Una compra genera crédito fiscal solo si:
 *  1. Es factura A/M.
 *  2. No es un cargo de sueldo (los sueldos NO generan crédito fiscal).
 *  3. Está afectada a actividad gravada.
 */
export const purchaseGrantsCredit = (inv: VatInvoice): {
  ok: boolean;
  reason?: string;
} => {
  if (!grantsInputTaxCredit(inv.invoiceType)) {
    return { ok: false, reason: `invoice_type_${inv.invoiceType}_no_credit` };
  }
  if (inv.isPayroll) return { ok: false, reason: "payroll_no_credit" };
  if (!inv.taxedActivity) return { ok: false, reason: "exempt_activity_no_credit" };
  return { ok: true };
};
