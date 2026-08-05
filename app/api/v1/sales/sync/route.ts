import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { handleSyncOfflineSales } from "@/infrastructure/http/handlers/pos-sync";

/**
 * Staff offline sale batch sync — ADR-024 / ADR-105.
 * Never used by store customer PWA.
 */
export async function POST(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleSyncOfflineSales(
    request,
    getApiContext(),
    session,
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
