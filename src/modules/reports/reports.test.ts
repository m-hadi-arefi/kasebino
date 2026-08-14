import { describe, expect, it } from "vitest";
import {
  GetDebtAgingUseCase,
  GetInventoryValuationUseCase,
  GetProfitSummaryUseCase,
  InMemoryReportRepository,
} from "./index.ts";

describe("Operational Reports Module (Profit, Stock Valuation, AR/AP Aging)", () => {
  it("calculates Net Profit correctly (Revenue - COGS - Expenses = Net Profit)", async () => {
    const repo = new InMemoryReportRepository();
    const profitUC = new GetProfitSummaryUseCase(repo);

    const report = await profitUC.execute("m-01", "2026-02-01", "2026-02-28");
    expect(report.totalRevenueMinor).toBe(150000000n);
    expect(report.totalCogsMinor).toBe(90000000n);
    expect(report.grossProfitMinor).toBe(60000000n);
    expect(report.totalExpensesMinor).toBe(15000000n);
    expect(report.netProfitMinor).toBe(45000000n); // 4.5M IRR net profit
  });

  it("retrieves stock valuation summary", async () => {
    const repo = new InMemoryReportRepository();
    const valuationUC = new GetInventoryValuationUseCase(repo);

    const valuation = await valuationUC.execute("m-01");
    expect(valuation.totalProductsCount).toBe(45);
    expect(valuation.totalValueMinor).toBe(480000000n);
  });

  it("retrieves customer receivables and supplier payables aging schedule", async () => {
    const repo = new InMemoryReportRepository();
    const debtUC = new GetDebtAgingUseCase(repo);

    const aging = await debtUC.execute("m-01");
    expect(aging.customerReceivables.totalBalanceMinor).toBe(16000000n);
    expect(aging.supplierPayables.totalBalanceMinor).toBe(35000000n);
  });
});
