import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { handleGetStore, handleUpdateStore } from "@/infrastructure/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleGetStore(request, getApiContext(), session, id);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleUpdateStore(request, getApiContext(), session, id);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
