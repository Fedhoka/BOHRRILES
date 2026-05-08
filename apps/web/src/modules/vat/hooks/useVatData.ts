import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api.js";
import { useAuthStore } from "../../../store/auth.js";

export interface SalesInvoice {
  id: string; period: string; issueDate: string; invoiceType: string;
  pointOfSale: number; number: number; buyerCuit?: string; buyerName?: string;
  netAmount: number; vat21: number; vat105: number; vat27: number; total: number;
}

export interface PurchaseInvoice {
  id: string; period: string; issueDate: string; invoiceType: string;
  pointOfSale: number; number: number; supplierCuit: string; supplierName: string;
  netAmount: number; vat21: number; vat105: number; vat27: number; total: number;
  grantsCredit: boolean; isPayroll: boolean;
}

export interface VatPreview {
  result: {
    debitVat: number; creditVatGross: number; proportionalityFactor: number;
    creditVatAfterProportionality: number; technicalBalanceCurrent: number;
    technicalBalanceNext: number; withholdingsApplied: number; perceptionsApplied: number;
    freeBalanceNext: number; payable: number;
    detail: { debit: Record<string,number>; credit: Record<string,number>; rejectedCredit: {reason:string;amount:number}[] };
  };
  counts: { sales: number; purchases: number; withholdings: number; perceptions: number };
  previous: { period: string; technicalBalanceNext: number; freeBalanceNext: number } | null;
}

export function useVatData(period: string) {
  const clientId = useAuthStore((s) => s.activeClientId);
  const [sales, setSales] = useState<SalesInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [preview, setPreview] = useState<VatPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId || !period) return;
    setLoading(true);
    setError(null);
    try {
      const [s, p, pr] = await Promise.all([
        api.get<SalesInvoice[]>("/invoices/sales", { params: { period } }),
        api.get<PurchaseInvoice[]>("/invoices/purchases", { params: { period } }),
        api.get<VatPreview>("/vat-returns/preview", { params: { period } }),
      ]);
      setSales(s.data);
      setPurchases(p.data);
      setPreview(pr.data);
    } catch {
      setError("Error al cargar los datos del período.");
    } finally {
      setLoading(false);
    }
  }, [clientId, period]);

  useEffect(() => { load(); }, [load]);

  return { sales, purchases, preview, loading, error, reload: load };
}
