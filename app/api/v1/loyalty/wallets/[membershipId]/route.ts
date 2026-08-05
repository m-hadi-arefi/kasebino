import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleGetWallet } from "@/infrastructure/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { membershipId } = await context.params;
  const result = await handleGetWallet(request, getApiContext(), session, membershipId);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
