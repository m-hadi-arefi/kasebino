import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleGetInventoryProduct } from "@/infrastructure/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { productId } = await context.params;
  const result = await handleGetInventoryProduct(request, getApiContext(), session, productId);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
