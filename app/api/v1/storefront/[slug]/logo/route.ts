import { NextResponse } from "next/server";

import { getApiContext } from "@/infrastructure/composition";
import {
  handleStorefrontLogo,
  isHttpBinaryResult,
} from "@/infrastructure/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const result = await handleStorefrontLogo(request, getApiContext(), slug);
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
