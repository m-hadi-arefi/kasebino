import { describe, expect, it } from "vitest";
import { createErrorEnvelope } from "../contracts/api-standards/index.js";
import {
  BARCODE_MISS_RECOVERY,
  ERROR_BOUNDARY_COPY_FA,
  ERROR_PRESENTATION_MODES,
  ERROR_UX_FALLBACK_FA,
  ERROR_UX_IRANIAN_RULES,
  FORBIDDEN_ERROR_UX_PATTERNS,
  FRONTEND_ERROR_MESSAGES_FA,
  FRONTEND_ERROR_UX_DECISION,
  FRONTEND_ERROR_UX_STRATEGY,
  MerchantErrorBoundary,
  OPTIMISTIC_SAFE_CONTEXTS,
  OTP_RECOVERY,
  PRESENTATION_POLICY,
  assertFrontendErrorUxGate,
  assertNotForbiddenErrorUxPattern,
  assertOptimisticOnlyWhenSafe,
  assertPersianUiErrorMessage,
  createMerchantErrorBoundaryElement,
  isForbiddenErrorUxPattern,
  looksLikeOtpLeak,
  looksLikeStackTrace,
  mapApiCodeToUiMessage,
  sanitizeUserErrorMessage,
  selectPresentation,
  toUiError,
  uiErrorFromApiEnvelope,
  uiErrorFromNetworkFailure,
} from "./index.js";

describe("ADR-028 Frontend Error Handling UX", () => {
  it("locks typed envelope toast/inline/boundary and rejects alert spam", () => {
    expect(FRONTEND_ERROR_UX_DECISION.adr).toBe("ADR-028");
    expect(FRONTEND_ERROR_UX_DECISION.typedErrorEnvelope).toBe(true);
    expect(FRONTEND_ERROR_UX_DECISION.toastInlineBoundary).toBe(true);
    expect(FRONTEND_ERROR_UX_DECISION.rejectAlertSpam).toBe(true);
    expect(FRONTEND_ERROR_UX_DECISION.neverShowEnglishStackToUsers).toBe(true);
    expect(FRONTEND_ERROR_UX_DECISION.neverShowOtpInErrors).toBe(true);
    expect(FRONTEND_ERROR_UX_DECISION.optimisticOnlyWhereSafe).toBe(true);
    expect(FRONTEND_ERROR_UX_DECISION.barcodeMissRecovery).toBe(true);
    expect(ERROR_PRESENTATION_MODES).toEqual(["toast", "inline", "boundary"]);
    expect(FORBIDDEN_ERROR_UX_PATTERNS).toEqual(
      expect.arrayContaining([
        "alert_spam",
        "english_stack_to_user",
        "otp_in_error_message",
        "silent_failure",
      ]),
    );
    expect(isForbiddenErrorUxPattern("alert_spam")).toBe(true);
    expect(() => assertNotForbiddenErrorUxPattern("alert_spam")).toThrow(
      /Forbidden error UX pattern/,
    );
    expect(() =>
      assertNotForbiddenErrorUxPattern("toast_with_persian"),
    ).not.toThrow();
    expect(FRONTEND_ERROR_UX_STRATEGY.decision).toEqual(
      FRONTEND_ERROR_UX_DECISION,
    );
  });

  it("maps API and UI codes to Persian plain-language messages", () => {
    for (const message of Object.values(FRONTEND_ERROR_MESSAGES_FA)) {
      assertPersianUiErrorMessage(message);
      expect(message).not.toMatch(/exception|stack|invalid|error/i);
    }
    expect(mapApiCodeToUiMessage("VALIDATION_ERROR")).toMatch(
      /[\u0600-\u06FF]/,
    );
    expect(mapApiCodeToUiMessage("BARCODE_NOT_FOUND")).toMatch(/بارکد/);
    expect(mapApiCodeToUiMessage("TOTALLY_UNKNOWN_CODE")).toBe(
      ERROR_UX_FALLBACK_FA,
    );
    expect(() => assertPersianUiErrorMessage("Internal Server Error")).toThrow(
      /Persian/,
    );
  });

  it("selects toast/inline/boundary and barcode recovery CTAs", () => {
    expect(selectPresentation("VALIDATION_ERROR")).toBe("inline");
    expect(selectPresentation("NETWORK_ERROR")).toBe("toast");
    expect(selectPresentation("BARCODE_NOT_FOUND")).toBe("toast");
    expect(selectPresentation("UNKNOWN")).toBe("boundary");
    expect(PRESENTATION_POLICY.inlineAboveKeyboard).toBe(true);

    const miss = toUiError({ code: "BARCODE_NOT_FOUND" });
    expect(miss.presentation).toBe("toast");
    expect(miss.messageFa).toMatch(/[\u0600-\u06FF]/);
    expect(miss.recoveryActions).toEqual(BARCODE_MISS_RECOVERY);
    expect(miss.optimisticSafe).toBe(false);

    const otp = toUiError({ code: "OTP_INVALID" });
    expect(otp.recoveryActions).toEqual(OTP_RECOVERY);
    expect(otp.messageFa).not.toMatch(/\d{4,8}/);
  });

  it("sanitizes stacks and OTP leaks away from users", () => {
    const stack =
      "TypeError: Cannot read properties of undefined\n    at PosCart (pos.tsx:12:3)";
    expect(looksLikeStackTrace(stack)).toBe(true);
    const cleaned = sanitizeUserErrorMessage(stack);
    expect(cleaned.strippedStack).toBe(true);
    expect(cleaned.message).toBe(ERROR_UX_FALLBACK_FA);
    expect(cleaned.message).not.toMatch(/TypeError|at PosCart/);

    const otpLeak = "otp: 483921 verification failed";
    expect(looksLikeOtpLeak(otpLeak)).toBe(true);
    const otpClean = sanitizeUserErrorMessage(otpLeak);
    expect(otpClean.strippedOtp).toBe(true);
    expect(otpClean.message).not.toMatch(/483921/);

    const faOtpLeak = "کد تأیید 123456 نامعتبر است";
    const faClean = sanitizeUserErrorMessage(faOtpLeak);
    expect(faClean.strippedOtp).toBe(true);
    expect(faClean.message).not.toMatch(/123456/);
  });

  it("lifts ADR-030 envelopes and network failures into UiError", () => {
    const envelope = createErrorEnvelope({
      code: "RATE_LIMITED",
      correlationId: "corr-28",
    });
    const ui = uiErrorFromApiEnvelope(envelope, {
      showCorrelationToSupport: true,
    });
    expect(ui.code).toBe("RATE_LIMITED");
    expect(ui.presentation).toBe("toast");
    expect(ui.correlationId).toBe("corr-28");
    expect(ui.supportHintFa).toMatch(/corr-28/);
    expect(ui.messageFa).toMatch(/[\u0600-\u06FF]/);
    expect(ui.sampleErrorEvent).toBe(true);

    const net = uiErrorFromNetworkFailure({ timeout: true });
    expect(net.code).toBe("TIMEOUT");
    expect(net.presentation).toBe("toast");
  });

  it("allows optimistic UI only on safe contexts", () => {
    expect(OPTIMISTIC_SAFE_CONTEXTS).toContain("pos_cart_qty_local");
    expect(() =>
      assertOptimisticOnlyWhenSafe("pos_cart_qty_local", true),
    ).not.toThrow();
    expect(() =>
      assertOptimisticOnlyWhenSafe("sale_complete", true),
    ).toThrow(/Optimistic UI only where safe/);
    expect(() =>
      assertOptimisticOnlyWhenSafe("sale_complete", false),
    ).not.toThrow();
  });

  it("exposes fa/rtl Iranian error contract and passes uiux gate", () => {
    expect(ERROR_UX_IRANIAN_RULES.lang).toBe("fa");
    expect(ERROR_UX_IRANIAN_RULES.dir).toBe("rtl");
    expect(ERROR_UX_IRANIAN_RULES.neverShowOtpInErrors).toBe(true);
    expect(ERROR_UX_IRANIAN_RULES.noEnglishStackToUsers).toBe(true);
    expect(ERROR_UX_IRANIAN_RULES.inlineErrorsAboveKeyboard).toBe(true);
    expect(ERROR_UX_IRANIAN_RULES.minRetryTouchTargetPx).toBe(44);
    expect(() => assertFrontendErrorUxGate()).not.toThrow();
  });

  it("MerchantErrorBoundary provides Persian fallback without stacks", () => {
    expect(ERROR_BOUNDARY_COPY_FA.title).toMatch(/[\u0600-\u06FF]/);
    expect(ERROR_BOUNDARY_COPY_FA.retry).toMatch(/[\u0600-\u06FF]/);
    expect(ERROR_BOUNDARY_COPY_FA.body).not.toMatch(/stack|Exception|at\s+/i);
    expect(typeof MerchantErrorBoundary).toBe("function");
    expect(typeof createMerchantErrorBoundaryElement).toBe("function");

    const derived = MerchantErrorBoundary.getDerivedStateFromError();
    expect(derived.hasError).toBe(true);
    expect(derived.messageFa).toBe(ERROR_BOUNDARY_COPY_FA.body);
    assertPersianUiErrorMessage(ERROR_BOUNDARY_COPY_FA.body);

    const el = createMerchantErrorBoundaryElement({
      children: null,
      fallbackMessageFa: ERROR_BOUNDARY_COPY_FA.body,
    });
    expect(el).toBeTruthy();
  });
});
