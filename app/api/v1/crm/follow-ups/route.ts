import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { handleCreateFollowUp } from "@/infrastructure/http/handlers/customer-crm";

export async function POST(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleCreateFollowUp(request, getApiContext(), session);
  return NextResponse.json(result.body, { status: result.status });
}
