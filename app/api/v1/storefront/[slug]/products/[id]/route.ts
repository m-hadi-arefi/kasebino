import { NextResponse } from "next/server";

import { getApiContext } from "@/infrastructure/composition";
import { handleStorefrontProduct } from "@/infrastructure/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  const result = await handleStorefrontProduct(
    request,
    getApiContext(),
    slug,
    id,
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
