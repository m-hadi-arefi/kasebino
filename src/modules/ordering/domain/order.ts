/**
 * Order aggregate + OrderLine (ADR-011 pickup-only).
 * Money IRR minor units. Fulfillment fixed to pickup.
 */

import {
  ORDER_FULFILLMENT_MODES,
  ORDER_STATUSES,
  assertPickupOnlyFulfillment,
  type OrderFulfillmentMode,
  type OrderStatus,
} from "../../../ordering-domain/index.js";

export { ORDER_FULFILLMENT_MODES, ORDER_STATUSES };
export type { OrderFulfillmentMode, OrderStatus };

export type OrderLine = {
  readonly id: string;
  readonly productId: string;
  /** Snapshot Persian product name at order time. */
  readonly productName: string;
  readonly quantity: number;
  /** Unit price IRR minor units (rial). */
  readonly unitPriceMinor: bigint;
  readonly lineTotalMinor: bigint;
};

export type Order = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  membershipId: string | null;
  customerId: string | null;
  readonly fulfillmentMode: OrderFulfillmentMode;
  status: OrderStatus;
  readonly lines: readonly OrderLine[];
  readonly totalAmountMinor: bigint;
  readonly idempotencyKey: string;
  /** When pending_payment started — drives unpaid 30m timer (ADR-091). */
  readonly pendingPaymentAt: Date;
  paidAt: Date | null;
  preparingAt: Date | null;
  /** When ready_for_pickup started — drives 24h hold (ADR-091). */
  readyForPickupAt: Date | null;
  pickedUpAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  cancelReason: string | null;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateOrderLineInput = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: bigint;
};

export type CreatePendingOrderInput = {
  id: string;
  merchantId: string;
  storeId: string;
  membershipId?: string | null;
  customerId?: string | null;
  lines: CreateOrderLineInput[];
  idempotencyKey: string;
  /** Must be pickup; delivery rejected. */
  fulfillmentMode?: string;
  now?: Date;
};

const HAPPY_PATH_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending_payment: "paid",
  paid: "preparing",
  preparing: "ready_for_pickup",
  ready_for_pickup: "picked_up",
  picked_up: "completed",
};

/** Statuses that may cancel (not already terminal). */
const CANCELLABLE: ReadonlySet<OrderStatus> = new Set([
  "pending_payment",
  "paid",
  "preparing",
  "ready_for_pickup",
]);

/** Paid+ statuses that may refund without completing pickup. */
const REFUNDABLE: ReadonlySet<OrderStatus> = new Set([
  "paid",
  "preparing",
  "ready_for_pickup",
  "cancelled",
]);

export function buildOrderLine(input: CreateOrderLineInput): OrderLine {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("INVALID_QUANTITY");
  }
  if (input.unitPriceMinor < 0n) {
    throw new Error("INVALID_PRICE");
  }
  if (!input.productName.trim()) {
    throw new Error("INVALID_PRODUCT_NAME");
  }
  const lineTotalMinor = input.unitPriceMinor * BigInt(input.quantity);
  return {
    id: input.id,
    productId: input.productId,
    productName: input.productName.trim(),
    quantity: input.quantity,
    unitPriceMinor: input.unitPriceMinor,
    lineTotalMinor,
  };
}

export function createPendingOrder(input: CreatePendingOrderInput): Order {
  const mode = input.fulfillmentMode ?? "pickup";
  assertPickupOnlyFulfillment(mode);
  if (input.lines.length < 1) {
    throw new Error("EMPTY_LINES");
  }
  if (!input.idempotencyKey.trim()) {
    throw new Error("IDEMPOTENCY_REQUIRED");
  }
  if (!input.merchantId.trim() || !input.storeId.trim()) {
    throw new Error("INVALID_TENANT");
  }

  const now = input.now ?? new Date();
  const lines = input.lines.map(buildOrderLine);
  const totalAmountMinor = lines.reduce(
    (sum, line) => sum + line.lineTotalMinor,
    0n,
  );

  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId,
    membershipId: input.membershipId ?? null,
    customerId: input.customerId ?? null,
    fulfillmentMode: "pickup",
    status: "pending_payment",
    lines,
    totalAmountMinor,
    idempotencyKey: input.idempotencyKey.trim(),
    pendingPaymentAt: now,
    paidAt: null,
    preparingAt: null,
    readyForPickupAt: null,
    pickedUpAt: null,
    completedAt: null,
    cancelledAt: null,
    refundedAt: null,
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (HAPPY_PATH_NEXT[from] !== to) {
    throw new Error("INVALID_TRANSITION");
  }
}

export function markOrderPaid(order: Order, at: Date = new Date()): void {
  assertTransition(order.status, "paid");
  order.status = "paid";
  order.paidAt = at;
  order.updatedAt = at;
}

export function startOrderPreparing(order: Order, at: Date = new Date()): void {
  assertTransition(order.status, "preparing");
  order.status = "preparing";
  order.preparingAt = at;
  order.updatedAt = at;
}

export function markOrderReadyForPickup(
  order: Order,
  at: Date = new Date(),
): void {
  assertTransition(order.status, "ready_for_pickup");
  order.status = "ready_for_pickup";
  order.readyForPickupAt = at;
  order.updatedAt = at;
}

export function markOrderPickedUp(order: Order, at: Date = new Date()): void {
  assertTransition(order.status, "picked_up");
  order.status = "picked_up";
  order.pickedUpAt = at;
  order.updatedAt = at;
}

export function completeOrder(order: Order, at: Date = new Date()): void {
  assertTransition(order.status, "completed");
  order.status = "completed";
  order.completedAt = at;
  order.updatedAt = at;
}

export function cancelOrder(
  order: Order,
  reason?: string,
  at: Date = new Date(),
): void {
  if (!CANCELLABLE.has(order.status)) {
    throw new Error("INVALID_TRANSITION");
  }
  order.status = "cancelled";
  order.cancelledAt = at;
  order.cancelReason = reason?.trim() || null;
  order.updatedAt = at;
}

/**
 * Explicit staff/admin refund (ADR-091: no silent refund on no-show).
 * Allowed from paid/preparing/ready_for_pickup, or cancelled after payment.
 */
export function refundOrder(order: Order, at: Date = new Date()): void {
  if (!REFUNDABLE.has(order.status)) {
    throw new Error("INVALID_TRANSITION");
  }
  if (order.status === "cancelled" && order.paidAt === null) {
    throw new Error("INVALID_TRANSITION");
  }
  order.status = "refunded";
  order.refundedAt = at;
  order.updatedAt = at;
}

export function wasOrderPaid(order: Order): boolean {
  return order.paidAt !== null;
}
