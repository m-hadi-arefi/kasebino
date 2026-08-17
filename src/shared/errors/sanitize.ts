/**
 * Sanitize user-facing error text (ADR-028).
 * Never show English stacks; never leak OTP secrets.
 */

import {
  ERROR_UX_FALLBACK_FA,
  assertPersianUiErrorMessage,
} from "./messages.js";

/** Patterns that must never reach customers/merchants. */
const STACK_LIKE =
  /\b(at\s+\S+\s+\(|Error:\s|TypeError|ReferenceError|SyntaxError|AggregateError|ENOENT|ECONNREFUSED|stack trace)\b/i;

/** OTP / secrets — digits sequences or labeled OTP fragments. */
const OTP_LEAK =
  /\b(otp|one[-\s]?time|verification\s*code)\s*[:=]?\s*\d{4,8}\b/i;

const STANDALONE_OTP_DIGITS = /\b\d{4,8}\b/;

const ENGLISH_JARGON_UX =
  /\b(exception|null reference|undefined is not|internal server error|stack)\b/i;

export type SanitizeResult = {
  message: string;
  strippedStack: boolean;
  strippedOtp: boolean;
  replacedWithFallback: boolean;
};

/**
 * Produce a safe Persian (or fallback) user message.
 * Prefer already-Persian envelope messages; never pass through stacks/OTP.
 */
export function sanitizeUserErrorMessage(
  raw: string | null | undefined,
): SanitizeResult {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return {
      message: ERROR_UX_FALLBACK_FA,
      strippedStack: false,
      strippedOtp: false,
      replacedWithFallback: true,
    };
  }

  let strippedStack = false;
  let strippedOtp = false;

  if (STACK_LIKE.test(trimmed) || ENGLISH_JARGON_UX.test(trimmed)) {
    strippedStack = true;
    return {
      message: ERROR_UX_FALLBACK_FA,
      strippedStack,
      strippedOtp: false,
      replacedWithFallback: true,
    };
  }

  if (OTP_LEAK.test(trimmed)) {
    strippedOtp = true;
    return {
      message: ERROR_UX_FALLBACK_FA,
      strippedStack: false,
      strippedOtp,
      replacedWithFallback: true,
    };
  }

  // Persian OTP UX may mention «کد تأیید» but must not embed digit secrets.
  if (
    /کد\s*تأیید|کد\s*تایید/.test(trimmed) &&
    STANDALONE_OTP_DIGITS.test(trimmed)
  ) {
    strippedOtp = true;
    return {
      message: "کد تأیید نادرست است. دوباره تلاش کنید.",
      strippedStack: false,
      strippedOtp,
      replacedWithFallback: true,
    };
  }

  if (!/[\u0600-\u06FF]/.test(trimmed)) {
    return {
      message: ERROR_UX_FALLBACK_FA,
      strippedStack: false,
      strippedOtp: false,
      replacedWithFallback: true,
    };
  }

  assertPersianUiErrorMessage(trimmed);
  return {
    message: trimmed,
    strippedStack: false,
    strippedOtp: false,
    replacedWithFallback: false,
  };
}

/** True when text looks like a developer stack / English exception. */
export function looksLikeStackTrace(text: string): boolean {
  return STACK_LIKE.test(text);
}

/** True when text appears to embed OTP digits/secrets. */
export function looksLikeOtpLeak(text: string): boolean {
  return OTP_LEAK.test(text);
}
