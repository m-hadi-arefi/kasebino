import { NextResponse } from "next/server";

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  ensureCorrelationId,
} from "@/shared/contracts/api-standards";
import { signIn } from "@/auth";

/**
 * Verify merchant OTP and establish Auth.js JWT session cookie (AUTH-05).
 * Credentials authorize runs createMerchantOtpAuthorize → verifyOtp once.
 */
export async function POST(request: Request) {
  const correlationId = ensureCorrelationId(
    request.headers.get("x-correlation-id"),
  );

  try {
    const raw = (await request.json()) as {
      phone?: unknown;
      code?: unknown;
    };
    const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
    const code = typeof raw.code === "string" ? raw.code.trim() : "";
    if (!phone || !code) {
      return NextResponse.json(
        createErrorEnvelope({
          code: "VALIDATION_ERROR",
          correlationId,
          messageFa: "شماره موبایل و کد تأیید الزامی است.",
        }),
        { status: 400 },
      );
    }

    await signIn("merchant-otp", {
      phone,
      code,
      redirect: false,
    });

    return NextResponse.json(
      createSuccessEnvelope({
        ok: true,
        audience: "merchant" as const,
      }),
    );
  } catch {
    return NextResponse.json(
      createErrorEnvelope({
        code: "UNAUTHORIZED",
        correlationId,
        messageFa: "ورود ناموفق بود. کد تأیید را بررسی کنید.",
      }),
      { status: 401 },
    );
  }
}
