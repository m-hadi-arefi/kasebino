import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { handleListStockMovements } from "@/infrastructure/http";

export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleListStockMovements(
    request,
    getApiContext(),
    session,
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
