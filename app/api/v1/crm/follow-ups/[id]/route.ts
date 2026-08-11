import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { handleUpdateFollowUpStatus } from "@/infrastructure/http/handlers/customer-crm";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleUpdateFollowUpStatus(
    request,
    getApiContext(),
    session,
    params.id,
  );
  return NextResponse.json(result.body, { status: result.status });
}
