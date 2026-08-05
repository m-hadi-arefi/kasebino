import { NextResponse } from "next/server";

import { getApiContext } from "@/infrastructure/composition";
import { handleStorefrontProducts } from "@/infrastructure/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const result = await handleStorefrontProducts(request, getApiContext(), slug);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
