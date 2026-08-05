import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleGetMembershipHistory } from "@/infrastructure/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleGetMembershipHistory(
    request,
    getApiContext(),
    session,
    id,
  );
  return NextResponse.json(result.body, { status: result.status });
}
