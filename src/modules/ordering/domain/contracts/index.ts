/**
 * ADR-011 — Pickup Order Architecture contract.
 *
 * Pickup-only Order lifecycle; timers from ADR-091 (`PICKUP_TIMER_POLICY`).
 * No delivery/courier/shipping. Checkout/merchant UI → ARD-011/034 + uiuxpromax.
 */

import { PICKUP_TIMER_POLICY } from "../../../../shared/contracts/mvp-policies/index.js";

export { PICKUP_TIMER_POLICY };

/** Happy path + terminals (ADR-011 / pickup-order-architecture.md). */
export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "preparing",
  "ready_for_pickup",
  "picked_up",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TERMINAL_STATUSES = [
  "completed",
  "cancelled",
  "refunded",
] as const satisfies readonly OrderStatus[];

export type OrderTerminalStatus = (typeof ORDER_TERMINAL_STATUSES)[number];

/** MVP fulfillment — fixed pickup; delivery requires superseding ADR. */
export const ORDER_FULFILLMENT_MODES = ["pickup"] as const;
export type OrderFulfillmentMode = (typeof ORDER_FULFILLMENT_MODES)[number];

export const FORBIDDEN_FULFILLMENT_MODES = [
  "delivery",
  "courier",
  "shipping",
] as const;

export const ORDER_EVENTS = [
  "OrderCreated",
  "OrderPaid",
  "OrderPreparing",
  "OrderReadyForPickup",
  "OrderPickedUp",
  "OrderCompleted",
  "OrderCanceled",
  "OrderRefunded",
] as const;

export type OrderEventName = (typeof ORDER_EVENTS)[number];

/** Out of MVP — must never be emitted by ordering module. */
export const ORDER_OUT_OF_MVP_EVENTS = ["OrderDelivered"] as const;

/**
 * Binding decision snapshot (ADR-011 + ADR-091 pickup timers).
 */
export const ORDERING_DECISION = {
  module: "ordering",
  aggregate: "Order",
  fulfillmentMode: "pickup" as const,
  forbiddenFulfillmentModes: FORBIDDEN_FULFILLMENT_MODES,
  statuses: ORDER_STATUSES,
  happyPath: [
    "pending_payment",
    "paid",
    "preparing",
    "ready_for_pickup",
    "picked_up",
    "completed",
  ] as const,
  terminals: ORDER_TERMINAL_STATUSES,
  timers: PICKUP_TIMER_POLICY,
  inventoryReserveOn: "paid" as const,
  paymentPort: "ADR-012",
  paymentProviderSelection: "ADR-084",
  checkoutUiDeferredTo: "ARD-034",
  apiDeferredTo: "ARD-011",
  timerJobsDeferredTo: "ADR-035",
  events: ORDER_EVENTS,
  outOfMvpEvents: ORDER_OUT_OF_MVP_EVENTS,
  noShippingTables: true,
} as const;

/**
 * Iranian First — Persian pickup status labels (domain contract; UI later).
 */
export const ORDER_STATUS_LABELS_FA = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  preparing: "در حال آماده‌سازی",
  ready_for_pickup: "آماده تحویل",
  picked_up: "تحویل‌گرفته‌شده",
  completed: "تکمیل‌شده",
  cancelled: "لغو شده",
  refunded: "بازپرداخت‌شده",
} as const satisfies Record<OrderStatus, string>;

export const ORDERING_COPY_FA = {
  fulfillmentPickupOnly: "فقط دریافت حضوری از فروشگاه",
  unpaidTimeoutHint: "اگر تا ۳۰ دقیقه پرداخت نشود، سفارش لغو می‌شود.",
  readyHoldHint:
    "سفارش آماده تحویل تا ۲۴ ساعت نگه داشته می‌شود؛ بازپرداخت خودکار نیست.",
  navigateToStore: "برای دریافت سفارش به فروشگاه بیایید.",
} as const;

/** Cache invalidation notes — adapters later (ADR-052/054). */
export const ORDERING_CACHE = {
  listKeyHint: "mos:{env}:{merchantId}:store:{storeId}:orders:list",
  detailKeyHint: "mos:{env}:{merchantId}:order:{orderId}",
  ttlSeconds: 60,
  invalidateOn: ORDER_EVENTS,
  neverSourceOfTruth: true,
} as const;

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isOrderTerminalStatus(
  value: OrderStatus,
): value is OrderTerminalStatus {
  return (ORDER_TERMINAL_STATUSES as readonly string[]).includes(value);
}

export function assertPickupOnlyFulfillment(mode: string): asserts mode is OrderFulfillmentMode {
  if (mode !== "pickup") {
    throw new Error(
      `Fulfillment must be pickup-only (ADR-011/082); got "${mode}".`,
    );
  }
}

export function orderStatusLabelFa(status: OrderStatus): string {
  return ORDER_STATUS_LABELS_FA[status];
}

export const ORDERING = {
  decision: ORDERING_DECISION,
  events: ORDER_EVENTS,
  statusLabelsFa: ORDER_STATUS_LABELS_FA,
  copyFa: ORDERING_COPY_FA,
  cache: ORDERING_CACHE,
} as const;
