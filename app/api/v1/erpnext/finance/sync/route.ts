import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth/session-guard";
import { getApiContext } from "@/infrastructure/composition";
import { handleFinanceSyncList } from "@/infrastructure/http";

export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleFinanceSyncList(
    request,
    getApiContext(),
    session,
  );
  return NextResponse.json(result.body, { status: result.status });
}
