import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { handleCustomerStorefrontMeReceipts } from "@/infrastructure/http";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = (await auth()) as AuthSessionSnapshot;
  const { slug } = await context.params;
  const result = await handleCustomerStorefrontMeReceipts(
    request,
    getApiContext(),
    session,
    slug,
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
