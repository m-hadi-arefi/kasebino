import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleAdminActivateMerchant } from "@/infrastructure/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleAdminActivateMerchant(request, getApiContext(), session, id);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
