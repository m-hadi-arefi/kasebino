import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleListProducts } from "@/infrastructure/http";

/**
 * ADR-096 alias — `GET /api/v1/catalog/products/search?q=`
 * Delegates to list/search handler (query param `q`).
 */
export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleListProducts(request, getApiContext(), session);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
