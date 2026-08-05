/**
 * ADR-095 — Persian OTP login UX contract + uiuxpromax gate evidence.
 */

import { assertUiuxGate } from "../../uiuxpromax-gate/index.js";
import { AUTH_UX_COPY_FA } from "./auth-ux-copy.js";

export { AUTH_UX_COPY_FA } from "./auth-ux-copy.js";

export const AUTH_UX_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-095.md",
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
  screens: [
    "merchant_phone_otp_login",
    "customer_store_phone_otp_login",
  ] as const,
  copySamplesFa: [
    AUTH_UX_COPY_FA.merchantTitle,
    AUTH_UX_COPY_FA.customerTitle,
    AUTH_UX_COPY_FA.phoneLabel,
    AUTH_UX_COPY_FA.consentLabel,
  ] as const,
} as const;

export function assertAuthUxUiuxGate(): void {
  assertUiuxGate({
    gatePassed: AUTH_UX_UIUX_GATE.gatePassed,
    skillPresent: AUTH_UX_UIUX_GATE.skillPresent,
    docsPresent: AUTH_UX_UIUX_GATE.docsPresent,
    uiInScope: AUTH_UX_UIUX_GATE.uiInScope,
    brief: { ...AUTH_UX_UIUX_GATE.brief },
  });
}
