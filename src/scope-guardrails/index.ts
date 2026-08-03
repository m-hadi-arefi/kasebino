/**
 * ADR-015 — MVP Scope Guardrails and Non-Goals.
 *
 * Reject feature invention that expands into ERP / delivery / marketplace.
 * Import before scaffolding domains that might smuggle non-goals.
 */

import {
  FORBIDDEN_CAPABILITIES,
  RETENTION_LOOPS,
  assertCapabilityAllowed,
  isForbiddenCapability,
  type ForbiddenCapability,
} from "../product-architecture/index.js";

/** Canonical MVP non-goal ids (PRD §3 + ADR-015 Decision). */
export const MVP_NON_GOALS = FORBIDDEN_CAPABILITIES;

export type MvpNonGoal = ForbiddenCapability;

/**
 * Iranian-native MVP priorities that must not be displaced by out-of-scope work.
 * Cross-check against ADR-001 retention loops.
 */
export const MVP_IN_SCOPE_PRIORITIES = [
  "pos_checkout_speed",
  "pos_phone_capture",
  "store_membership",
  "sms_otp",
  "loyalty_wallet",
  "qr_acquisition",
  "storefront_path_url",
  "store_pwa",
  "pickup_order",
  "retention_analytics",
] as const;

export type MvpInScopePriority = (typeof MVP_IN_SCOPE_PRIORITIES)[number];

/** Policy note for agents/reviews. */
export const SCOPE_SUPERSEDE_POLICY =
  "MVP non-goals may only be introduced via a superseding Accepted ADR (ADR-015)." as const;

export function isMvpNonGoal(capability: string): capability is MvpNonGoal {
  return isForbiddenCapability(capability);
}

/**
 * Throws when a proposed capability is an MVP hard non-goal.
 * Allowed capabilities (including unknown future in-scope work) pass.
 */
export function assertWithinMvpScope(capability: string): void {
  try {
    assertCapabilityAllowed(capability);
  } catch {
    throw new Error(
      `Capability "${capability}" violates MVP scope guardrails (ADR-015 / PRD §3). ${SCOPE_SUPERSEDE_POLICY}`,
    );
  }
}

/** Snapshot for docs/tests. */
export const SCOPE_GUARDRAILS = {
  nonGoals: MVP_NON_GOALS,
  inScopePriorities: MVP_IN_SCOPE_PRIORITIES,
  retentionLoops: RETENTION_LOOPS,
  supersedePolicy: SCOPE_SUPERSEDE_POLICY,
} as const;
