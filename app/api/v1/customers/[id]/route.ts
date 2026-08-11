import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import {
  handleArchiveCustomer,
  handleGetCustomer360,
  handleUpdateCustomer,
} from "@/infrastructure/http/handlers/customer-crm";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleGetCustomer360(
    request,
    getApiContext(),
    session,
    params.id,
  );
  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleUpdateCustomer(
    request,
    getApiContext(),
    session,
    params.id,
  );
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleArchiveCustomer(
    request,
    getApiContext(),
    session,
    params.id,
  );
  return NextResponse.json(result.body, { status: result.status });
}
