import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import {
  handleGetStoreQr,
  isHttpBinaryResult,
} from "@/infrastructure/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { id } = await context.params;
  const result = await handleGetStoreQr(request, getApiContext(), session, id);
  if (isHttpBinaryResult(result)) {
    return new NextResponse(new Uint8Array(result.body), {
      status: result.status,
      headers: result.headers,
    });
  }
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
