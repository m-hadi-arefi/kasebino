import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import {
  handleDeleteProductImage,
  handleUploadProductImage,
} from "@/infrastructure/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleUploadProductImage(
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleDeleteProductImage(
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
