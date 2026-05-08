import { describe, it, expect } from "vitest";
import {
  calcVatDebit,
  calcVatCredit,
  calcProportionality,
  calcVatReturn,
  grantsInputTaxCredit,
  purchaseGrantsCredit,
  type VatInvoice,
  type Withholding,
  type Perception,
} from "../vat/index.js";

const sale = (over: Partial<VatInvoice>): VatInvoice => ({
  id: over.id ?? crypto.randomUUID(),
  invoiceType: "A",
  netAmount: 0,
  vat21: 0,
  vat105: 0,
  vat27: 0,
  exempt: 0,
  isPayroll: false,
  taxedActivity: true,
  ...over,
});

describe("VAT rules", () => {
  it("only A and M grant input tax credit", () => {
    expect(grantsInputTaxCredit("A")).toBe(true);
    expect(grantsInputTaxCredit("M")).toBe(true);
    expect(grantsInputTaxCredit("B")).toBe(false);
    expect(grantsInputTaxCredit("C")).toBe(false);
    expect(grantsInputTaxCredit("E")).toBe(false);
  });

  it("payroll never grants credit even on type A", () => {
    const p = sale({ invoiceType: "A", vat21: 100, isPayroll: true });
    expect(purchaseGrantsCredit(p).ok).toBe(false);
    expect(purchaseGrantsCredit(p).reason).toBe("payroll_no_credit");
  });

  it("exempt activity rejects credit", () => {
    const p = sale({ invoiceType: "A", vat21: 100, taxedActivity: false });
    expect(purchaseGrantsCredit(p).ok).toBe(false);
    expect(purchaseGrantsCredit(p).reason).toBe("exempt_activity_no_credit");
  });
});

describe("calcVatDebit", () => {
  it("sums VAT across all sales regardless of invoice type", () => {
    const sales = [
      sale({ invoiceType: "A", netAmount: 1000, vat21: 210 }),
      sale({ invoiceType: "B", netAmount: 500, vat21: 105 }),
      sale({ invoiceType: "A", netAmount: 200, vat105: 21 }),
    ];
    const r = calcVatDebit(sales);
    expect(r.total).toBe(336);
    expect(r.vat21).toBe(315);
    expect(r.vat105).toBe(21);
  });
});

describe("calcVatCredit", () => {
  it("excludes B/C/E invoices", () => {
    const purchases = [
      sale({ invoiceType: "A", vat21: 210 }),
      sale({ invoiceType: "B", vat21: 105 }),
      sale({ invoiceType: "M", vat21: 50 }),
      sale({ invoiceType: "C", vat21: 30 }),
    ];
    const r = calcVatCredit(purchases);
    expect(r.total).toBe(260);
    expect(r.rejected).toHaveLength(2);
  });

  it("excludes payroll items even if type A", () => {
    const purchases = [
      sale({ invoiceType: "A", vat21: 200 }),
      sale({ invoiceType: "A", vat21: 1000, isPayroll: true }),
    ];
    const r = calcVatCredit(purchases);
    expect(r.total).toBe(200);
    expect(r.rejected.find((x) => x.reason === "payroll_no_credit")).toBeTruthy();
  });
});

describe("calcProportionality", () => {
  it("returns 1 when all sales are taxed", () => {
    const sales = [sale({ invoiceType: "A", netAmount: 1000, vat21: 210 })];
    expect(calcProportionality(sales)).toBe(1);
  });

  it("returns 0 when all sales are exempt", () => {
    const sales = [sale({ invoiceType: "C", netAmount: 1000, exempt: 1000 })];
    expect(calcProportionality(sales)).toBe(0);
  });

  it("computes ratio for mixed activity", () => {
    const sales = [
      sale({ invoiceType: "A", netAmount: 700, vat21: 147 }),
      sale({ invoiceType: "C", netAmount: 300 }),
    ];
    expect(calcProportionality(sales)).toBeCloseTo(0.7, 4);
  });

  it("returns 1 with no sales (avoid divide by zero)", () => {
    expect(calcProportionality([])).toBe(1);
  });
});

describe("calcVatReturn", () => {
  it("simple period: positive payable", () => {
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 10000, vat21: 2100 })],
      purchases: [sale({ invoiceType: "A", vat21: 800 })],
      withholdings: [],
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 0,
    });
    expect(r.debitVat).toBe(2100);
    expect(r.creditVatGross).toBe(800);
    expect(r.creditVatAfterProportionality).toBe(800);
    expect(r.payable).toBe(1300);
    expect(r.technicalBalanceNext).toBe(0);
  });

  it("technical balance carries forward when credit > debit", () => {
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 5000, vat21: 1050 })],
      purchases: [sale({ invoiceType: "A", vat21: 1500 })],
      withholdings: [],
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 0,
    });
    expect(r.payable).toBe(0);
    expect(r.technicalBalanceNext).toBe(450);
    expect(r.freeBalanceNext).toBe(0);
  });

  it("previous technical balance reduces current debit", () => {
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 10000, vat21: 2100 })],
      purchases: [sale({ invoiceType: "A", vat21: 500 })],
      withholdings: [],
      perceptions: [],
      technicalBalancePrevious: 1000,
      freeBalancePrevious: 0,
    });
    expect(r.payable).toBe(600); // 2100 - 500 - 1000
    expect(r.technicalBalanceNext).toBe(0);
  });

  it("withholdings reduce payable, not credit", () => {
    const wh: Withholding[] = [{ id: "1", taxType: "iva", amount: 300 }];
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 10000, vat21: 2100 })],
      purchases: [sale({ invoiceType: "A", vat21: 800 })],
      withholdings: wh,
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 0,
    });
    expect(r.creditVatGross).toBe(800);
    expect(r.withholdingsApplied).toBe(300);
    expect(r.payable).toBe(1000); // 1300 - 300
  });

  it("withholdings exceeding payable create free balance for next period", () => {
    const wh: Withholding[] = [{ id: "1", taxType: "iva", amount: 2000 }];
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 10000, vat21: 2100 })],
      purchases: [sale({ invoiceType: "A", vat21: 800 })],
      withholdings: wh,
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 0,
    });
    expect(r.payable).toBe(0);
    expect(r.freeBalanceNext).toBe(700); // 2000 - 1300
    expect(r.technicalBalanceNext).toBe(0);
  });

  it("technical balance ≠ free balance: technical does NOT come from withholdings", () => {
    // Pure technical excess (credit > debit), no withholdings.
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 1000, vat21: 210 })],
      purchases: [sale({ invoiceType: "A", vat21: 500 })],
      withholdings: [],
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 0,
    });
    expect(r.technicalBalanceNext).toBe(290);
    expect(r.freeBalanceNext).toBe(0);
  });

  it("payroll purchase rejected from credit (smoke through return)", () => {
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 10000, vat21: 2100 })],
      purchases: [
        sale({ invoiceType: "A", vat21: 200 }),
        sale({ invoiceType: "A", vat21: 1500, isPayroll: true }),
      ],
      withholdings: [],
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 0,
    });
    expect(r.creditVatGross).toBe(200);
    expect(r.detail.rejectedCredit.some((x) => x.reason === "payroll_no_credit")).toBe(true);
  });

  it("proportionality applied to credit when activity is mixed", () => {
    const r = calcVatReturn({
      sales: [
        sale({ invoiceType: "A", netAmount: 700, vat21: 147 }),
        sale({ invoiceType: "C", netAmount: 300 }),
      ],
      purchases: [sale({ invoiceType: "A", vat21: 1000 })],
      withholdings: [],
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 0,
    });
    expect(r.proportionalityFactor).toBeCloseTo(0.7, 4);
    expect(r.creditVatAfterProportionality).toBe(700);
  });

  it("non-IVA withholdings (ganancias, iibb) do not reduce VAT payable", () => {
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 10000, vat21: 2100 })],
      purchases: [sale({ invoiceType: "A", vat21: 800 })],
      withholdings: [
        { id: "1", taxType: "ganancias", amount: 500 },
        { id: "2", taxType: "iibb", amount: 200 },
      ],
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 0,
    });
    expect(r.withholdingsApplied).toBe(0);
    expect(r.payable).toBe(1300);
  });

  it("free balance from previous period reduces payable", () => {
    const r = calcVatReturn({
      sales: [sale({ invoiceType: "A", netAmount: 10000, vat21: 2100 })],
      purchases: [sale({ invoiceType: "A", vat21: 800 })],
      withholdings: [],
      perceptions: [],
      technicalBalancePrevious: 0,
      freeBalancePrevious: 500,
    });
    expect(r.payable).toBe(800); // 1300 - 500
    expect(r.freeBalanceNext).toBe(0);
  });
});
