import { describe, it, expect } from "vitest";
import {
  calcEarnings,
  calcDeductions,
  calcEmployerContributions,
  calcBonusPay,
  calcSeverancePay,
  calcIncomeTax4th,
  lookupCctScale,
} from "../payroll/index.js";

describe("calcEarnings", () => {
  it("computes basic salary prorated by days", () => {
    const r = calcEarnings({ baseSalary: 600000, daysWorked: 15 });
    expect(r.basicSalary).toBe(300000);
  });

  it("seniority is 1% per year of service", () => {
    const r = calcEarnings({ baseSalary: 600000, yearsOfService: 5 });
    expect(r.seniority).toBe(30000);
  });

  it("overtime 50% and 100% computed off hourly rate", () => {
    const r = calcEarnings({
      baseSalary: 600000,
      hourlyRate: 3000,
      overtime50Hours: 10,
      overtime100Hours: 4,
    });
    expect(r.overtime50).toBe(45000); // 3000 * 1.5 * 10
    expect(r.overtime100).toBe(24000); // 3000 * 2 * 4
  });

  it("non-remunerative does not enter remunerative total", () => {
    const r = calcEarnings({ baseSalary: 600000, nonRemunerative: 50000 });
    expect(r.remunerativeTotal).toBe(600000);
    expect(r.grossTotal).toBe(650000);
  });
});

describe("calcDeductions", () => {
  it("11% jubilación + 3% OS + 3% PAMI", () => {
    const r = calcDeductions({ remunerativeTotal: 1000000 });
    expect(r.jubilacion).toBe(110000);
    expect(r.obraSocial).toBe(30000);
    expect(r.ley19032).toBe(30000);
    expect(r.total).toBe(170000);
  });

  it("union dues % applied", () => {
    const r = calcDeductions({ remunerativeTotal: 1000000, unionDuesPct: 2 });
    expect(r.unionFee).toBe(20000);
    expect(r.total).toBe(190000);
  });
});

describe("calcEmployerContributions", () => {
  it("full rates total ~26.81% + ART", () => {
    const r = calcEmployerContributions({
      remunerativeTotal: 1000000,
      artFixed: 500,
      artVariablePct: 1.5,
    });
    // 12.71+1.59+6+5.4+1.11 = 26.81 → 268100; ART = 500 + 15000 = 15500
    expect(r.jubilacion).toBe(127100);
    expect(r.inssjp).toBe(15900);
    expect(r.obraSocial).toBe(60000);
    expect(r.asignacionesFamiliares).toBe(54000);
    expect(r.fnde).toBe(11100);
    expect(r.art).toBe(15500);
    expect(r.total).toBe(283600);
  });

  it("micro employer rates lower", () => {
    const r = calcEmployerContributions({ remunerativeTotal: 1000000, isMicroEmployer: true });
    expect(r.jubilacion).toBe(107700);
  });
});

describe("calcBonusPay (SAC)", () => {
  it("uses BEST monthly remuneration of semester, not average", () => {
    const r = calcBonusPay({
      monthlyRemunerations: [500000, 500000, 500000, 500000, 500000, 900000],
    });
    // Best = 900000; SAC full semester = 450000
    expect(r.bestMonth).toBe(900000);
    expect(r.bonusPay).toBe(450000);
  });

  it("prorates by days worked when partial semester", () => {
    const r = calcBonusPay({
      monthlyRemunerations: [600000, 600000, 600000],
      daysWorkedInSemester: 90,
    });
    // 600000 / 2 * (90/180) = 150000
    expect(r.bonusPay).toBe(150000);
  });
});

describe("calcSeverancePay (LCT)", () => {
  it("dismissal without cause: art 245 base = best of last 12 months", () => {
    const r = calcSeverancePay({
      cause: "sin_causa",
      monthlySalariesLast12m: [
        500000, 500000, 600000, 600000, 700000, 700000,
        800000, 800000, 900000, 900000, 1000000, 1100000,
      ],
      yearsOfService: 5,
      monthsInLastFraction: 4, // ≥3, suma año adicional
      hireDate: new Date("2020-01-01"),
      terminationDate: new Date("2026-05-01"),
      daysIntoTerminationMonth: 1,
      daysWorkedCurrentSemester: 120,
      vacationDaysAccrued: 7,
    });
    expect(r.bestSalary12m).toBe(1100000);
    expect(r.yearsForCompensation).toBe(6); // 5 + 1 (4 meses)
    expect(r.severanceArt245).toBe(6600000); // 1100000 * 6
  });

  it("less than 3-month fraction: no extra year", () => {
    const r = calcSeverancePay({
      cause: "sin_causa",
      monthlySalariesLast12m: [800000, 900000, 1000000],
      yearsOfService: 3,
      monthsInLastFraction: 2,
      hireDate: new Date(),
      terminationDate: new Date(),
      daysIntoTerminationMonth: 30,
      daysWorkedCurrentSemester: 0,
      vacationDaysAccrued: 0,
    });
    expect(r.yearsForCompensation).toBe(3);
    expect(r.severanceArt245).toBe(3000000);
  });

  it("preaviso 1 month if ≤5 years; 2 months if >5", () => {
    const a = calcSeverancePay({
      cause: "sin_causa",
      monthlySalariesLast12m: [500000],
      yearsOfService: 4,
      monthsInLastFraction: 0,
      hireDate: new Date(),
      terminationDate: new Date(),
      daysIntoTerminationMonth: 30,
      daysWorkedCurrentSemester: 0,
      vacationDaysAccrued: 0,
    });
    expect(a.preavisoArt231).toBe(500000);

    const b = calcSeverancePay({
      cause: "sin_causa",
      monthlySalariesLast12m: [500000],
      yearsOfService: 7,
      monthsInLastFraction: 0,
      hireDate: new Date(),
      terminationDate: new Date(),
      daysIntoTerminationMonth: 30,
      daysWorkedCurrentSemester: 0,
      vacationDaysAccrued: 0,
    });
    expect(b.preavisoArt231).toBe(1000000);
  });

  it("renuncia: only SAC proporcional + vacaciones", () => {
    const r = calcSeverancePay({
      cause: "renuncia",
      monthlySalariesLast12m: [600000, 700000],
      yearsOfService: 3,
      monthsInLastFraction: 4,
      hireDate: new Date(),
      terminationDate: new Date(),
      daysIntoTerminationMonth: 15,
      daysWorkedCurrentSemester: 90,
      vacationDaysAccrued: 5,
    });
    expect(r.severanceArt245).toBe(0);
    expect(r.preavisoArt231).toBe(0);
    expect(r.integracionMes).toBe(0);
    expect(r.sacProporcional).toBeGreaterThan(0);
    expect(r.vacacionesNoGozadas).toBeGreaterThan(0);
  });

  it("fallecimiento: 50% of art 245", () => {
    const r = calcSeverancePay({
      cause: "fallecimiento",
      monthlySalariesLast12m: [1000000],
      yearsOfService: 4,
      monthsInLastFraction: 0,
      hireDate: new Date(),
      terminationDate: new Date(),
      daysIntoTerminationMonth: 30,
      daysWorkedCurrentSemester: 0,
      vacationDaysAccrued: 0,
    });
    expect(r.severanceArt245).toBe(2000000); // 1M * 4 * 0.5
  });
});

describe("calcIncomeTax4th (annual cumulative)", () => {
  it("zero tax when YTD net taxable below threshold", () => {
    const r = calcIncomeTax4th({
      monthIndex: 3,
      ytdGrossRemuneration: 1_500_000,
      ytdMandatoryContributions: 255_000, // 17%
      ytdWithheldPriorMonths: 0,
    });
    expect(r.withheldThisMonth).toBe(0);
  });

  it("positive tax when YTD remuneration is high", () => {
    const r = calcIncomeTax4th({
      monthIndex: 6,
      ytdGrossRemuneration: 18_000_000,
      ytdMandatoryContributions: 3_060_000,
      ytdWithheldPriorMonths: 0,
    });
    expect(r.withheldThisMonth).toBeGreaterThan(0);
  });

  it("subtracts prior withholdings (acumulativo)", () => {
    const month3 = calcIncomeTax4th({
      monthIndex: 3,
      ytdGrossRemuneration: 9_000_000,
      ytdMandatoryContributions: 1_530_000,
      ytdWithheldPriorMonths: 0,
    });
    const month4 = calcIncomeTax4th({
      monthIndex: 4,
      ytdGrossRemuneration: 12_000_000,
      ytdMandatoryContributions: 2_040_000,
      ytdWithheldPriorMonths: month3.determinedTax,
    });
    // mes 4 sólo retiene la diferencia entre el determinado acumulado y lo retenido en m1-m3
    expect(month4.withheldThisMonth).toBeLessThan(month4.determinedTax);
  });

  it("never returns negative withholding (only refunds via annual reconciliation)", () => {
    const r = calcIncomeTax4th({
      monthIndex: 12,
      ytdGrossRemuneration: 5_000_000,
      ytdMandatoryContributions: 850_000,
      ytdWithheldPriorMonths: 1_000_000, // overshot
    });
    expect(r.withheldThisMonth).toBe(0);
  });

  it("dependents reduce taxable base", () => {
    const noFamily = calcIncomeTax4th({
      monthIndex: 6,
      ytdGrossRemuneration: 18_000_000,
      ytdMandatoryContributions: 3_060_000,
      ytdWithheldPriorMonths: 0,
    });
    const withFamily = calcIncomeTax4th({
      monthIndex: 6,
      ytdGrossRemuneration: 18_000_000,
      ytdMandatoryContributions: 3_060_000,
      ytdWithheldPriorMonths: 0,
      hasSpouse: true,
      childrenCount: 2,
    });
    expect(withFamily.withheldThisMonth).toBeLessThan(noFamily.withheldThisMonth);
  });
});

describe("CCT scales lookup", () => {
  it("returns scale effective at or before target period", () => {
    const r = lookupCctScale("130/75", "Cajero", "2026-03");
    expect(r?.baseSalary).toBe(520000);
  });

  it("returns later scale once it's effective", () => {
    const r = lookupCctScale("130/75", "Cajero", "2026-04");
    expect(r?.baseSalary).toBe(560000);
  });

  it("returns undefined when period precedes any scale", () => {
    const r = lookupCctScale("130/75", "Cajero", "2025-12");
    expect(r).toBeUndefined();
  });

  it("supports hospitality and construction CCTs", () => {
    expect(lookupCctScale("389/04", "Mozo", "2026-04")?.baseSalary).toBe(540000);
    expect(lookupCctScale("76/75", "Oficial", "2026-04")?.baseSalary).toBe(760000);
  });
});
