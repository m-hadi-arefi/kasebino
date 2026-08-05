import { NextResponse } from "next/server";

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  ensureCorrelationId,
} from "@/api-standards";
import { signOut } from "@/auth";

/**
 * ADR-103 — Clear customer Auth.js session cookie.
 */
export async function POST(request: Request) {
  const correlationId = ensureCorrelationId(
    request.headers.get("x-correlation-id"),
  );

  try {
    await signOut({ redirect: false });
    return NextResponse.json(
      createSuccessEnvelope({
        ok: true,
        audience: "customer" as const,
      }),
    );
  } catch {
    return NextResponse.json(
      createErrorEnvelope({
        code: "INTERNAL_ERROR",
        correlationId,
        messageFa: "خروج ناموفق بود. دوباره تلاش کنید.",
      }),
      { status: 500 },
    );
  }
}
