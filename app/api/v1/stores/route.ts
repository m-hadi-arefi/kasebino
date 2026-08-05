import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleCreateStore, handleListStores } from "@/infrastructure/http";

export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleListStores(request, getApiContext(), session);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}

export async function POST(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleCreateStore(request, getApiContext(), session);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
