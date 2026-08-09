import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth/session-guard";
import { getApiContext } from "@/infrastructure/composition";
import { handleSaleFinancialStatus } from "@/infrastructure/http";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ saleId: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { saleId } = await ctx.params;
  const result = await handleSaleFinancialStatus(
    request,
    getApiContext(),
    session,
    saleId,
  );
  return NextResponse.json(result.body, { status: result.status });
}
