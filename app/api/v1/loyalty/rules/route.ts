import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

import { handleConfigureLoyaltyRule, handleGetLoyaltyRule } from "@/infrastructure/http";

export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleGetLoyaltyRule(request, getApiContext(), session);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}

export async function PUT(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleConfigureLoyaltyRule(request, getApiContext(), session);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}

export async function POST(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleConfigureLoyaltyRule(request, getApiContext(), session);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
