import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import {
  handleDeleteCategory,
  handleUpdateCategory,
} from "@/infrastructure/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleUpdateCategory(
    request,
    getApiContext(),
    session,
    id,
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return PATCH(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleDeleteCategory(
    request,
    getApiContext(),
    session,
    id,
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
