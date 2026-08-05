import { NextResponse } from "next/server";

import { handleTelemetryProductFunnel } from "@/infrastructure/http";

/** ADR-110 — product/POS funnel beacon (browser → server → Mongo). */
export async function POST(request: Request) {
  const result = await handleTelemetryProductFunnel(request);
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
