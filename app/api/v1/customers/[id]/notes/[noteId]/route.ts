import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { handleDeleteCustomerNote } from "@/infrastructure/http/handlers/customer-crm";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; noteId: string }> },
) {
  const params = await props.params;
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleDeleteCustomerNote(
    request,
    getApiContext(),
    session,
    params.noteId,
  );
  return NextResponse.json(result.body, { status: result.status });
}
