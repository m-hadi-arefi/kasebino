/**
 * Ordering (pickup) bounded context — ADR-011 Pickup Order Architecture.
 * Pickup-only Order lifecycle; timers ADR-091; payment via ADR-012 sandbox
 * PaymentConfirmPort (default); inventory ports stubs.
 * API/UI → ARD-011/034. Timer scheduler → ADR-035.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
export {
  ORDER_STATUS_LABELS_FA,
  ORDERING_COPY_FA,
  ORDERING_DECISION,
  orderStatusLabelFa,
} from "./domain/contracts/index.js";
