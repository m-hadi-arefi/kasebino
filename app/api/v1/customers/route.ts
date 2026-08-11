import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import {
  handleCreateCustomer,
  handleListCustomers,
} from "@/infrastructure/http/handlers/customer-crm";

export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleListCustomers(request, getApiContext(), session);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const result = await handleCreateCustomer(request, getApiContext(), session);
  return NextResponse.json(result.body, { status: result.status });
}
