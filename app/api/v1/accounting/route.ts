import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth/session-guard";
import { getApiContext } from "@/infrastructure/composition";
import {
  handleBalanceSheet,
  handleChartOfAccounts,
  handleFinanceDashboard,
  handleGeneralLedger,
  handleIntegrityCheck,
  handlePayables,
  handleProfitAndLoss,
  handleReceivables,
  handleTrialBalance,
} from "@/infrastructure/http";

export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const ctx = getApiContext();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "dashboard";

  if (action === "dashboard") {
    const result = await handleFinanceDashboard(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (action === "chart-of-accounts") {
    const result = await handleChartOfAccounts(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (action === "general-ledger") {
    const result = await handleGeneralLedger(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (action === "reports/profit-and-loss" || action === "profit-and-loss") {
    const result = await handleProfitAndLoss(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (action === "reports/balance-sheet" || action === "balance-sheet") {
    const result = await handleBalanceSheet(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (action === "reports/trial-balance" || action === "trial-balance") {
    const result = await handleTrialBalance(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (action === "payables") {
    const result = await handlePayables(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (action === "receivables") {
    const result = await handleReceivables(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (action === "integrity") {
    const result = await handleIntegrityCheck(request, ctx, session);
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json(
    { ok: false, error: "NOT_FOUND", messageFa: "عملیات نامعتبر است" },
    { status: 404 },
  );
}
