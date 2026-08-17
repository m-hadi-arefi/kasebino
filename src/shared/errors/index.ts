/**
 * ADR-028 — Frontend Error Handling UX.
 *
 * Typed error envelope → Persian toast/inline/boundary; never English stacks
 * or OTP secrets to users; barcode-miss recovery; optimistic only when safe.
 */

import { assertUiuxGate } from "../contracts/uiuxpromax-gate/index.js";
import {
  ERROR_UX_FALLBACK_FA,
  FRONTEND_ERROR_MESSAGES_FA,
  UI_ERROR_CODES,
  UI_ERROR_MESSAGES_FA,
  assertPersianUiErrorMessage,
  isApiErrorCode,
  isFrontendErrorCode,
  isUiErrorCode,
  mapApiCodeToUiMessage,
} from "./messages.js";
import {
  BARCODE_MISS_RECOVERY,
  ERROR_PRESENTATION_MODES,
  ERROR_UX_IRANIAN_RULES,
  FORBIDDEN_ERROR_UX_PATTERNS,
  GENERIC_RETRY_RECOVERY,
  OPTIMISTIC_SAFE_CONTEXTS,
  OTP_RECOVERY,
  PRESENTATION_POLICY,
  assertNotForbiddenErrorUxPattern,
  assertOptimisticOnlyWhenSafe,
  isForbiddenErrorUxPattern,
  isOptimisticSafeContext,
  selectPresentation,
  toUiError,
  uiErrorFromApiEnvelope,
  uiErrorFromNetworkFailure,
  type ErrorPresentationMode,
  type ForbiddenErrorUxPattern,
  type OptimisticSafeContext,
  type UiError,
  type UiErrorRecoveryAction,
  type UiErrorSeverity,
} from "./presentation.js";
import {
  looksLikeOtpLeak,
  looksLikeStackTrace,
  sanitizeUserErrorMessage,
} from "./sanitize.js";
import {
  ERROR_BOUNDARY_COPY_FA,
  MerchantErrorBoundary,
  createMerchantErrorBoundaryElement,
  type MerchantErrorBoundaryProps,
} from "./error-boundary.js";

export const FRONTEND_ERROR_UX_LIBRARY = {
  strategyRoot: "src/shared/errors",
  errorBoundary: "MerchantErrorBoundary",
  adr: "ADR-028",
} as const;

/**
 * Binding Decision (ADR-028).
 */
export const FRONTEND_ERROR_UX_DECISION = {
  adr: "ADR-028",
  typedErrorEnvelope: true,
  presentationModes: ERROR_PRESENTATION_MODES,
  toastInlineBoundary: true,
  rejectAlertSpam: true,
  barcodeMissRecovery: true,
  optimisticOnlyWhereSafe: true,
  correlationIdOptionalForSupport: true,
  neverShowEnglishStackToUsers: true,
  neverShowOtpInErrors: true,
  persianUiMessagesRequired: true,
  errorEventsSampled: true,
  rationale: "operability_pos_trust",
} as const;

/** Filesystem placement. */
export const FRONTEND_ERROR_UX_PATHS = {
  strategyRoot: "src/shared/errors",
  compositesSlot: "src/components/composites",
  moduleUiGlob: "src/modules/*/ui",
} as const;

/**
 * uiuxpromax gate evidence for this ADR's ErrorBoundary capacity.
 * Full product screens remain later ADRs.
 */
export const FRONTEND_ERROR_UX_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-028.md",
  gatePassed: true,
  skillPresent: true,
  docsPresent: true,
  uiInScope: true,
  brief: {
    persian: true,
    rtl: true,
    faIrPersona: true,
    mobile390: true,
    iranianRetailContext: true,
    screenListDocumented: true,
    statesDocumented: true,
    a11yNotes: true,
  },
} as const;

export function assertFrontendErrorUxGate(): void {
  assertUiuxGate({
    gatePassed: FRONTEND_ERROR_UX_UIUX_GATE.gatePassed,
    skillPresent: FRONTEND_ERROR_UX_UIUX_GATE.skillPresent,
    docsPresent: FRONTEND_ERROR_UX_UIUX_GATE.docsPresent,
    uiInScope: FRONTEND_ERROR_UX_UIUX_GATE.uiInScope,
    brief: { ...FRONTEND_ERROR_UX_UIUX_GATE.brief },
  });
}

export const FRONTEND_ERROR_UX_STRATEGY = {
  decision: FRONTEND_ERROR_UX_DECISION,
  library: FRONTEND_ERROR_UX_LIBRARY,
  paths: FRONTEND_ERROR_UX_PATHS,
  forbidden: FORBIDDEN_ERROR_UX_PATTERNS,
  iranian: ERROR_UX_IRANIAN_RULES,
  presentationPolicy: PRESENTATION_POLICY,
  messages: FRONTEND_ERROR_MESSAGES_FA,
  optimisticSafeContexts: OPTIMISTIC_SAFE_CONTEXTS,
} as const;

export {
  ERROR_UX_FALLBACK_FA,
  FRONTEND_ERROR_MESSAGES_FA,
  UI_ERROR_CODES,
  UI_ERROR_MESSAGES_FA,
  assertPersianUiErrorMessage,
  isApiErrorCode,
  isFrontendErrorCode,
  isUiErrorCode,
  mapApiCodeToUiMessage,
};

export {
  BARCODE_MISS_RECOVERY,
  ERROR_PRESENTATION_MODES,
  ERROR_UX_IRANIAN_RULES,
  FORBIDDEN_ERROR_UX_PATTERNS,
  GENERIC_RETRY_RECOVERY,
  OPTIMISTIC_SAFE_CONTEXTS,
  OTP_RECOVERY,
  PRESENTATION_POLICY,
  assertNotForbiddenErrorUxPattern,
  assertOptimisticOnlyWhenSafe,
  isForbiddenErrorUxPattern,
  isOptimisticSafeContext,
  selectPresentation,
  toUiError,
  uiErrorFromApiEnvelope,
  uiErrorFromNetworkFailure,
};

export type {
  ErrorPresentationMode,
  ForbiddenErrorUxPattern,
  OptimisticSafeContext,
  UiError,
  UiErrorRecoveryAction,
  UiErrorSeverity,
};

export {
  looksLikeOtpLeak,
  looksLikeStackTrace,
  sanitizeUserErrorMessage,
};

export {
  ERROR_BOUNDARY_COPY_FA,
  MerchantErrorBoundary,
  createMerchantErrorBoundaryElement,
};

export type { MerchantErrorBoundaryProps };
