import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleLookupProductByBarcode } from "@/infrastructure/http";

export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleLookupProductByBarcode(request, getApiContext(), session);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
