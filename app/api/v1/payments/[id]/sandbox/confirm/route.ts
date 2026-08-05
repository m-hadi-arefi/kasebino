import { NextResponse } from "next/server";

import { getApiContext } from "@/infrastructure/composition";
import { handleSandboxConfirmPayment } from "@/infrastructure/http";

/** Dev/local sandbox confirm — gated by MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM (ADR-102). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await handleSandboxConfirmPayment(
    request,
    getApiContext(),
    id,
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
