/**
 * Presentation modes + typed UI error envelope (ADR-028).
 */

import type { ApiErrorEnvelope } from "../contracts/api-standards/index.js";
import {
  ERROR_UX_FALLBACK_FA,
  mapApiCodeToUiMessage,
  type FrontendErrorCode,
  isFrontendErrorCode,
} from "./messages.js";
import { sanitizeUserErrorMessage } from "./sanitize.js";

export const ERROR_PRESENTATION_MODES = [
  "toast",
  "inline",
  "boundary",
] as const;

export type ErrorPresentationMode =
  (typeof ERROR_PRESENTATION_MODES)[number];

/** Rejected: alert() spam (ADR Alternatives). */
export const FORBIDDEN_ERROR_UX_PATTERNS = [
  "alert_spam",
  "window_alert_for_api_errors",
  "english_stack_to_user",
  "otp_in_error_message",
  "silent_failure",
  "optimistic_ui_unsafe",
] as const;

export type ForbiddenErrorUxPattern =
  (typeof FORBIDDEN_ERROR_UX_PATTERNS)[number];

export function isForbiddenErrorUxPattern(
  name: string,
): name is ForbiddenErrorUxPattern {
  return (FORBIDDEN_ERROR_UX_PATTERNS as readonly string[]).includes(name);
}

export function assertNotForbiddenErrorUxPattern(name: string): void {
  if (isForbiddenErrorUxPattern(name)) {
    throw new Error(
      `Forbidden error UX pattern "${name}" (ADR-028). Use toast/inline/boundary with Persian copy; never alert() spam, stacks, or OTP leaks.`,
    );
  }
}

/**
 * When to use each surface.
 * Validation → inline; transient network → toast; render crash → boundary.
 */
export const PRESENTATION_POLICY = {
  validation: "inline" as const,
  fieldLevel: "inline" as const,
  networkTransient: "toast" as const,
  barcodeMiss: "toast" as const,
  authSession: "toast" as const,
  renderCrash: "boundary" as const,
  unknownUnhandled: "boundary" as const,
  inlineAboveKeyboard: true,
  rtlIconLogicalInset: true,
} as const;

export const ERROR_UX_IRANIAN_RULES = {
  dir: "rtl" as const,
  lang: "fa" as const,
  locale: "fa-IR" as const,
  persianMessagesRequired: true,
  plainLanguageErrors: true,
  noEnglishUxJargon: true,
  noEnglishStackToUsers: true,
  neverShowOtpInErrors: true,
  inlineErrorsAboveKeyboard: true,
  rtlFieldOrder: true,
  rtlErrorIcons: true,
  mobileToastBrief: true,
  minRetryTouchTargetPx: 44,
} as const;

export type UiErrorSeverity = "info" | "warning" | "error";

export type UiErrorRecoveryAction = {
  id: string;
  labelFa: string;
};

export type UiError = {
  code: string;
  messageFa: string;
  presentation: ErrorPresentationMode;
  severity: UiErrorSeverity;
  correlationId?: string;
  /** Optional support hint — secondary, not primary copy. */
  supportHintFa?: string;
  recoveryActions: UiErrorRecoveryAction[];
  /** Optimistic UI must not apply unless this is true. */
  optimisticSafe: boolean;
  /** Analytics sampling flag (ADR-028) — no Mongo writer here. */
  sampleErrorEvent: boolean;
};

export const BARCODE_MISS_RECOVERY: UiErrorRecoveryAction[] = [
  { id: "rescan", labelFa: "دوباره اسکن کنید" },
  { id: "search_by_name", labelFa: "جستجو با نام کالا" },
];

export const GENERIC_RETRY_RECOVERY: UiErrorRecoveryAction[] = [
  { id: "retry", labelFa: "تلاش مجدد" },
];

export const OTP_RECOVERY: UiErrorRecoveryAction[] = [
  { id: "request_new_otp", labelFa: "درخواست کد جدید" },
];

const INLINE_CODES = new Set<string>(["VALIDATION_ERROR"]);

const TOAST_CODES = new Set<string>([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_KEY_REQUIRED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "NETWORK_ERROR",
  "TIMEOUT",
  "BARCODE_NOT_FOUND",
  "BARCODE_SCAN_FAILED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "OTP_RATE_LIMITED",
]);

const BOUNDARY_CODES = new Set<string>(["UNKNOWN"]);

/** Safe optimistic contexts only (ADR Decision). */
export const OPTIMISTIC_SAFE_CONTEXTS = [
  "pos_cart_qty_local",
  "ui_checkbox_toggle",
] as const;

export type OptimisticSafeContext =
  (typeof OPTIMISTIC_SAFE_CONTEXTS)[number];

export function isOptimisticSafeContext(
  context: string,
): context is OptimisticSafeContext {
  return (OPTIMISTIC_SAFE_CONTEXTS as readonly string[]).includes(context);
}

export function assertOptimisticOnlyWhenSafe(
  context: string,
  applyingOptimistic: boolean,
): void {
  if (applyingOptimistic && !isOptimisticSafeContext(context)) {
    throw new Error(
      `Optimistic UI only where safe (ADR-028); context "${context}" is not allowlisted.`,
    );
  }
}

export function selectPresentation(code: string): ErrorPresentationMode {
  if (INLINE_CODES.has(code)) return "inline";
  if (BOUNDARY_CODES.has(code)) return "boundary";
  if (TOAST_CODES.has(code)) return "toast";
  if (isFrontendErrorCode(code)) return "toast";
  return "boundary";
}

function recoveryFor(code: string): UiErrorRecoveryAction[] {
  if (code === "BARCODE_NOT_FOUND" || code === "BARCODE_SCAN_FAILED") {
    return BARCODE_MISS_RECOVERY;
  }
  if (
    code === "OTP_INVALID" ||
    code === "OTP_EXPIRED" ||
    code === "OTP_RATE_LIMITED"
  ) {
    return OTP_RECOVERY;
  }
  if (code === "VALIDATION_ERROR") {
    return [];
  }
  return GENERIC_RETRY_RECOVERY;
}

function severityFor(code: string): UiErrorSeverity {
  if (code === "VALIDATION_ERROR" || code === "BARCODE_NOT_FOUND") {
    return "warning";
  }
  if (code === "NETWORK_ERROR" || code === "TIMEOUT" || code === "RATE_LIMITED") {
    return "warning";
  }
  return "error";
}

/**
 * Build typed UI error from machine code (+ optional envelope fields).
 */
export function toUiError(input: {
  code: string;
  messageFa?: string | null;
  correlationId?: string | null;
  /** Show correlationId as secondary support hint. */
  showCorrelationToSupport?: boolean;
  sampleErrorEvent?: boolean;
}): UiError {
  const presentation = selectPresentation(input.code);
  const mapped = mapApiCodeToUiMessage(input.code);
  const preferred = input.messageFa?.trim() ? input.messageFa : mapped;
  const sanitized = sanitizeUserErrorMessage(preferred);
  const messageFa = sanitized.message || ERROR_UX_FALLBACK_FA;

  const correlationId = input.correlationId?.trim() || undefined;
  const showSupport = input.showCorrelationToSupport === true && correlationId;

  const result: UiError = {
    code: input.code,
    messageFa,
    presentation,
    severity: severityFor(input.code),
    recoveryActions: recoveryFor(input.code),
    optimisticSafe: false,
    sampleErrorEvent: input.sampleErrorEvent !== false,
  };

  if (correlationId) {
    result.correlationId = correlationId;
  }
  if (showSupport) {
    result.supportHintFa = `کد پیگیری پشتیبانی: ${correlationId}`;
  }

  return result;
}

/** Lift ADR-030 error envelope into UI error model. */
export function uiErrorFromApiEnvelope(
  envelope: ApiErrorEnvelope,
  options?: { showCorrelationToSupport?: boolean },
): UiError {
  return toUiError({
    code: envelope.error.code,
    messageFa: envelope.error.message,
    correlationId: envelope.error.correlationId,
    ...(options?.showCorrelationToSupport !== undefined
      ? { showCorrelationToSupport: options.showCorrelationToSupport }
      : {}),
  });
}

/** Network / fetch failure helper for TanStack Query error paths. */
export function uiErrorFromNetworkFailure(input?: {
  timeout?: boolean;
  correlationId?: string | null;
}): UiError {
  return toUiError({
    code: input?.timeout ? "TIMEOUT" : "NETWORK_ERROR",
    ...(input?.correlationId !== undefined
      ? { correlationId: input.correlationId }
      : {}),
  });
}

export type { FrontendErrorCode };
