import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth/session-guard";
import { getApiContext } from "@/infrastructure/composition";
import { handleCustomerFinancialOverview } from "@/infrastructure/http";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ customerId: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { customerId } = await ctx.params;
  const result = await handleCustomerFinancialOverview(
    request,
    getApiContext(),
    session,
    customerId,
  );
  return NextResponse.json(result.body, { status: result.status });
}
