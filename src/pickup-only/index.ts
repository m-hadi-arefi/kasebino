/**
 * ADR-082 — Pickup-Only Fulfillment MVP Decision.
 *
 * Cross-cutting reinforcement: MVP supports only in-store pickup.
 * Forbid delivery / courier / rider / shipping without a superseding ADR.
 * Aligns product-architecture (ADR-001) + ordering (ADR-011) + route guards.
 */

import {
  ALLOWED_FULFILLMENT_MODES,
  DEFAULT_FULFILLMENT_MODE,
  FORBIDDEN_CAPABILITIES,
  assertPickupOnlyFulfillment as assertProductPickupOnly,
  isAllowedFulfillmentMode,
  type FulfillmentMode,
} from "../product-architecture/index.js";
import {
  FORBIDDEN_FULFILLMENT_MODES,
  ORDER_FULFILLMENT_MODES,
  ORDER_STATUS_LABELS_FA,
  ORDERING_COPY_FA,
  ORDERING_DECISION,
  PICKUP_TIMER_POLICY,
  assertPickupOnlyFulfillment as assertOrderingPickupOnly,
  type OrderFulfillmentMode,
} from "../ordering-domain/index.js";
import {
  FORBIDDEN_URL_SEGMENTS,
  assertNoForbiddenUrlSegment,
  isForbiddenUrlSegment,
} from "../app-router-structure/index.js";
import { isMvpNonGoal } from "../scope-guardrails/index.js";

/** Sole MVP fulfillment type (Order.fulfillmentType = pickup). */
export const PICKUP_ONLY_FULFILLMENT = "pickup" as const satisfies FulfillmentMode;

/**
 * Delivery-class capabilities forbidden by ADR-082.
 * Subset of ADR-001 / ADR-015 non-goals — fulfillment-specific.
 */
export const FORBIDDEN_FULFILLMENT_CAPABILITIES = [
  "delivery",
  "courier",
  "rider_fleet",
  "shipping",
] as const;

export type ForbiddenFulfillmentCapability =
  (typeof FORBIDDEN_FULFILLMENT_CAPABILITIES)[number];

/** URL path segments that must never appear under app/ or API (aligned ADR-017). */
export const FORBIDDEN_FULFILLMENT_URL_SEGMENTS = FORBIDDEN_URL_SEGMENTS;

/**
 * Extra API/action aliases that smuggle delivery (e.g. POST .../deliver).
 * Not full route folders — action verbs / synonyms.
 */
export const FORBIDDEN_FULFILLMENT_ROUTE_ALIASES = [
  "deliver",
  "delivered",
  "dispatch",
  "shipment",
  "shipments",
  "last-mile",
  "last_mile",
] as const;

export type ForbiddenFulfillmentUrlSegment =
  (typeof FORBIDDEN_FULFILLMENT_URL_SEGMENTS)[number];

export type ForbiddenFulfillmentRouteAlias =
  (typeof FORBIDDEN_FULFILLMENT_ROUTE_ALIASES)[number];

/** Policy: introducing delivery requires superseding Accepted ADR. */
export const PICKUP_ONLY_SUPERSEDE_POLICY =
  "Delivery/courier/rider/shipping may only be introduced via a superseding Accepted ADR (ADR-082)." as const;

/** ADR-091 defaults restated for fulfillment enforcement. */
export const PICKUP_ONLY_TIMERS = {
  unpaidPendingPaymentTimeoutMinutes:
    PICKUP_TIMER_POLICY.unpaidPendingPaymentTimeoutMinutes,
  readyForPickupHoldHours: PICKUP_TIMER_POLICY.readyForPickupHoldHours,
  noShowSilentRefund: PICKUP_TIMER_POLICY.noShowSilentRefund,
  refundRequiresExplicitStaffAction:
    PICKUP_TIMER_POLICY.refundRequiresExplicitStaffAction,
} as const;

/**
 * Binding decision snapshot (ADR-082 + ADR-011 + ADR-091 timers).
 */
export const PICKUP_ONLY_DECISION = {
  adr: "ADR-082",
  fulfillmentType: PICKUP_ONLY_FULFILLMENT,
  allowedModes: ALLOWED_FULFILLMENT_MODES,
  defaultMode: DEFAULT_FULFILLMENT_MODE,
  forbiddenCapabilities: FORBIDDEN_FULFILLMENT_CAPABILITIES,
  forbiddenFulfillmentModes: FORBIDDEN_FULFILLMENT_MODES,
  forbiddenUrlSegments: FORBIDDEN_FULFILLMENT_URL_SEGMENTS,
  forbiddenRouteAliases: FORBIDDEN_FULFILLMENT_ROUTE_ALIASES,
  timers: PICKUP_ONLY_TIMERS,
  analyticsFunnel: "pickup_only" as const,
  shippingTables: false,
  deliveryUi: false,
  supersedePolicy: PICKUP_ONLY_SUPERSEDE_POLICY,
  checkoutUiDeferredTo: "ARD-034",
  orderingAggregate: ORDERING_DECISION.aggregate,
} as const;

/** Iranian First — Persian pickup labels/instructions (UI later via ARD-034). */
export const PICKUP_ONLY_COPY_FA = {
  fulfillmentPickupOnly: ORDERING_COPY_FA.fulfillmentPickupOnly,
  navigateToStore: ORDERING_COPY_FA.navigateToStore,
  unpaidTimeoutHint: ORDERING_COPY_FA.unpaidTimeoutHint,
  readyHoldHint: ORDERING_COPY_FA.readyHoldHint,
  readyForPickup: ORDER_STATUS_LABELS_FA.ready_for_pickup,
  completed: ORDER_STATUS_LABELS_FA.completed,
  cancelled: ORDER_STATUS_LABELS_FA.cancelled,
} as const;

export function isPickupOnlyFulfillmentMode(
  mode: string,
): mode is FulfillmentMode & OrderFulfillmentMode {
  return (
    isAllowedFulfillmentMode(mode) &&
    (ORDER_FULFILLMENT_MODES as readonly string[]).includes(mode)
  );
}

export function isForbiddenFulfillmentCapability(
  capability: string,
): capability is ForbiddenFulfillmentCapability {
  return (FORBIDDEN_FULFILLMENT_CAPABILITIES as readonly string[]).includes(
    capability,
  );
}

export function isForbiddenFulfillmentUrlSegment(
  segment: string,
): segment is ForbiddenFulfillmentUrlSegment {
  return isForbiddenUrlSegment(segment);
}

export function isForbiddenFulfillmentRouteAlias(
  segment: string,
): segment is ForbiddenFulfillmentRouteAlias {
  return (FORBIDDEN_FULFILLMENT_ROUTE_ALIASES as readonly string[]).includes(
    segment,
  );
}

export function isForbiddenFulfillmentRoutePart(segment: string): boolean {
  return (
    isForbiddenFulfillmentUrlSegment(segment) ||
    isForbiddenFulfillmentRouteAlias(segment)
  );
}

/**
 * Assert fulfillment mode is pickup — product-architecture + ordering aligned.
 */
export function assertPickupOnlyFulfillment(
  mode: string,
): asserts mode is FulfillmentMode & OrderFulfillmentMode {
  try {
    assertProductPickupOnly(mode);
    assertOrderingPickupOnly(mode);
  } catch {
    throw new Error(
      `Fulfillment must be pickup-only (ADR-082); got "${mode}". ${PICKUP_ONLY_SUPERSEDE_POLICY}`,
    );
  }
}

/**
 * Reject delivery-class capabilities (and broader MVP non-goals that match).
 */
export function assertPickupOnlyCapability(capability: string): void {
  if (isForbiddenFulfillmentCapability(capability) || isMvpNonGoal(capability)) {
    throw new Error(
      `Capability "${capability}" is forbidden under pickup-only MVP (ADR-082). ${PICKUP_ONLY_SUPERSEDE_POLICY}`,
    );
  }
}

/**
 * Reject forbidden URL path segments (delivery/courier/shipping/rider).
 */
export function assertPickupOnlyRouteSegment(segment: string): void {
  if (isForbiddenFulfillmentRouteAlias(segment)) {
    throw new Error(
      `URL segment "${segment}" is forbidden under pickup-only MVP (ADR-082). ${PICKUP_ONLY_SUPERSEDE_POLICY}`,
    );
  }
  try {
    assertNoForbiddenUrlSegment(segment);
  } catch {
    throw new Error(
      `URL segment "${segment}" is forbidden under pickup-only MVP (ADR-082). ${PICKUP_ONLY_SUPERSEDE_POLICY}`,
    );
  }
}

/**
 * Split a path and reject any forbidden fulfillment segment.
 * Accepts routes such as `/api/v1/orders/deliver` or `merchant/shipping`.
 */
export function assertPickupOnlyRoute(pathOrSegment: string): void {
  const normalized = pathOrSegment.trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return;
  }
  const segments = normalized.split("/").filter(Boolean);
  for (const segment of segments) {
    assertPickupOnlyRouteSegment(segment);
  }
}

/**
 * Catch-all: reject delivery as capability, route, or fulfillment mode.
 */
export function assertNoDeliveryAnywhere(feature: string): void {
  const value = feature.trim();
  if (!value) {
    throw new Error("Feature id is required for pickup-only assertion (ADR-082).");
  }

  if (isForbiddenFulfillmentCapability(value) || isMvpNonGoal(value)) {
    assertPickupOnlyCapability(value);
  }

  if (value.includes("/") || isForbiddenFulfillmentRoutePart(value)) {
    assertPickupOnlyRoute(value);
  }

  if (
    (FORBIDDEN_FULFILLMENT_MODES as readonly string[]).includes(value) ||
    (value !== PICKUP_ONLY_FULFILLMENT &&
      ["delivery", "courier", "shipping", "rider"].includes(value))
  ) {
    assertPickupOnlyFulfillment(value);
  }
}

/** Snapshot for docs/tests — keep aligned with ADR-001 + ADR-011 + ADR-015. */
export const PICKUP_ONLY = {
  decision: PICKUP_ONLY_DECISION,
  copyFa: PICKUP_ONLY_COPY_FA,
  statusLabelsFa: ORDER_STATUS_LABELS_FA,
  productForbiddenCapabilities: FORBIDDEN_CAPABILITIES,
  orderingForbiddenModes: FORBIDDEN_FULFILLMENT_MODES,
  supersedePolicy: PICKUP_ONLY_SUPERSEDE_POLICY,
} as const;
