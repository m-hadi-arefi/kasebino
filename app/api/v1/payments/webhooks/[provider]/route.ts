import { NextResponse } from "next/server";

import { getApiContext } from "@/infrastructure/composition";
import { handlePaymentWebhook } from "@/infrastructure/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const result = await handlePaymentWebhook(request, getApiContext(), provider);
  return NextResponse.json(result.body, { status: result.status });
}
