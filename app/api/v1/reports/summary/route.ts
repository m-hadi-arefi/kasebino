import { NextRequest, NextResponse } from "next/server";
import {
  GetDebtAgingUseCase,
  GetInventoryValuationUseCase,
  GetProfitSummaryUseCase,
  InMemoryReportRepository,
} from "../../../../../src/modules/reports/index.ts";

const repo = new InMemoryReportRepository();
const profitUC = new GetProfitSummaryUseCase(repo);
const valuationUC = new GetInventoryValuationUseCase(repo);
const debtUC = new GetDebtAgingUseCase(repo);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get("merchantId") ?? "m-default";
  const startDate = searchParams.get("startDate") ?? "2026-02-01";
  const endDate = searchParams.get("endDate") ?? "2026-02-28";

  const [profit, valuation, debt] = await Promise.all([
    profitUC.execute(merchantId, startDate, endDate),
    valuationUC.execute(merchantId),
    debtUC.execute(merchantId),
  ]);

  return NextResponse.json({
    profit,
    valuation,
    debt,
  });
}
