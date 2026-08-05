import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleLookupProductByBarcode } from "@/infrastructure/http";

/**
 * ADR-096 alias — `GET /api/v1/catalog/products/by-barcode?barcode=`
 * Delegates to the ADR-094 lookup handler.
 */
export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleLookupProductByBarcode(
    request,
    getApiContext(),
    session,
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
