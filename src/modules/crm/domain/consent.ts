/**
 * Membership consent record (ADR-007 + ADR-091).
 * POS: notice-continue (no checkbox). Digital: explicit checkbox required.
 */

import type { ConsentSurface } from "./membership/index.js";

export type MembershipConsent = {
  readonly surface: ConsentSurface;
  /** Versioned notice / checkbox copy id for audit. */
  readonly version: string;
  readonly consentedAt: Date;
};

export type MembershipConsentInput = {
  surface: ConsentSurface;
  version: string;
  consentedAt?: Date;
};

export function createMembershipConsent(
  input: MembershipConsentInput,
): MembershipConsent {
  return {
    surface: input.surface,
    version: input.version,
    consentedAt: input.consentedAt ?? new Date(),
  };
}
