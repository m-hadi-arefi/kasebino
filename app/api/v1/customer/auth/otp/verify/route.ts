import { NextResponse } from "next/server";

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  ensureCorrelationId,
} from "@/shared/contracts/api-standards";
import { signIn } from "@/auth";

/**
 * Verify customer OTP and establish customer-audience JWT session (ADR-032).
 */
export async function POST(request: Request) {
  const correlationId = ensureCorrelationId(
    request.headers.get("x-correlation-id"),
  );

  try {
    const raw = (await request.json()) as {
      phone?: unknown;
      code?: unknown;
      consentCheckboxAccepted?: unknown;
      storeId?: unknown;
    };
    const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
    const code = typeof raw.code === "string" ? raw.code.trim() : "";
    const consentCheckboxAccepted =
      raw.consentCheckboxAccepted === true ||
      raw.consentCheckboxAccepted === "true" ||
      raw.consentCheckboxAccepted === "1";
    const storeId =
      typeof raw.storeId === "string" ? raw.storeId.trim() : "";

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

    if (!consentCheckboxAccepted) {
      return NextResponse.json(
        createErrorEnvelope({
          code: "CONSENT_REQUIRED",
          correlationId,
          messageFa:
            "برای ورود، پذیرش ذخیره و استفاده از شماره الزامی است.",
        }),
        { status: 400 },
      );
    }

    await signIn("customer-otp", {
      phone,
      code,
      consentCheckboxAccepted: "true",
      storeId,
      redirect: false,
    });

    return NextResponse.json(
      createSuccessEnvelope({
        ok: true,
        audience: "customer" as const,
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
