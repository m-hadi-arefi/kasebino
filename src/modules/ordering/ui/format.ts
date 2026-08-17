/**
 * ADR-101 pickup board presentation — تومان + Jalali + ready-hold signals.
 */

import { PICKUP_TIMER_POLICY } from "../../../shared/contracts/mvp-policies/index.js";
import {
  ORDER_STATUS_LABELS_FA,
  orderStatusLabelFa,
} from "../domain/contracts/index.js";
import {
  formatTomanDisplay,
  moneyFromMinor,
} from "../../../shared/domain/money.js";
import type { OrderStatus } from "../domain/order.js";
import type { OrderDto, OrderTransitionAction } from "./api.js";
import { ORDERS_UI_COPY_FA } from "./copy.js";

export const BOARD_POLL_INTERVAL_MS = 15_000;

/** Statuses shown on the default "open" fulfillment board. */
export const BOARD_OPEN_STATUSES = [
  "pending_payment",
  "paid",
  "preparing",
  "ready_for_pickup",
  "picked_up",
] as const satisfies readonly OrderStatus[];

export type BoardOpenStatus = (typeof BOARD_OPEN_STATUSES)[number];

export type BoardStatusFilter = BoardOpenStatus | "open" | "all";

export type ReadyHoldSignal = "ok" | "urgent" | "expired" | "none";

const HAPPY_NEXT: Partial<
  Record<OrderStatus, { action: OrderTransitionAction; labelKey: keyof typeof ORDERS_UI_COPY_FA }>
> = {
  paid: { action: "preparing", labelKey: "actionPreparing" },
  preparing: { action: "ready", labelKey: "actionReady" },
  ready_for_pickup: { action: "picked-up", labelKey: "actionPickedUp" },
  picked_up: { action: "complete", labelKey: "actionComplete" },
};

const CANCELLABLE = new Set<OrderStatus>([
  "pending_payment",
  "paid",
  "preparing",
  "ready_for_pickup",
]);

const REFUNDABLE = new Set<OrderStatus>([
  "paid",
  "preparing",
  "ready_for_pickup",
  "cancelled",
]);

export function formatOrdersToman(
  amountMinor: string | number | bigint,
): string {
  const minor =
    typeof amountMinor === "bigint"
      ? amountMinor
      : BigInt(String(amountMinor));
  return formatTomanDisplay(moneyFromMinor(minor));
}

export function formatOrdersJalali(iso: string | null | undefined): string {
  if (!iso) return ORDERS_UI_COPY_FA.noDate;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function statusLabelFa(status: OrderStatus | string): string {
  if (status in ORDER_STATUS_LABELS_FA) {
    return orderStatusLabelFa(status as OrderStatus);
  }
  return status;
}

export function primaryActionForStatus(
  status: OrderStatus,
): { action: OrderTransitionAction; label: string } | null {
  const next = HAPPY_NEXT[status];
  if (!next) return null;
  return {
    action: next.action,
    label: ORDERS_UI_COPY_FA[next.labelKey],
  };
}

export function canCancelOrder(status: OrderStatus): boolean {
  return CANCELLABLE.has(status);
}

export function canRefundOrder(
  status: OrderStatus,
  paidAt: string | null,
): boolean {
  if (!REFUNDABLE.has(status)) return false;
  if (status === "cancelled" && !paidAt) return false;
  return true;
}

/**
 * Ready-hold signal for `ready_for_pickup` (ADR-091: 24h, no silent refund).
 * Urgent when ≥20h remaining window leaves ≤4h.
 */
export function readyHoldSignal(
  order: Pick<OrderDto, "status" | "readyForPickupAt">,
  now: Date = new Date(),
): ReadyHoldSignal {
  if (order.status !== "ready_for_pickup" || !order.readyForPickupAt) {
    return "none";
  }
  const ageHours =
    (now.getTime() - new Date(order.readyForPickupAt).getTime()) / 3_600_000;
  const holdHours = PICKUP_TIMER_POLICY.readyForPickupHoldHours;
  if (ageHours >= holdHours) return "expired";
  if (ageHours >= holdHours - 4) return "urgent";
  return "ok";
}

export function readyHoldHintFa(signal: ReadyHoldSignal): string | null {
  switch (signal) {
    case "ok":
      return ORDERS_UI_COPY_FA.readyHoldOk;
    case "urgent":
      return ORDERS_UI_COPY_FA.readyHoldUrgent;
    case "expired":
      return ORDERS_UI_COPY_FA.readyHoldExpired;
    default:
      return null;
  }
}

export function filterOrdersByStatus(
  orders: OrderDto[],
  filter: BoardStatusFilter,
): OrderDto[] {
  if (filter === "all") return orders;
  if (filter === "open") {
    return orders.filter((o) =>
      (BOARD_OPEN_STATUSES as readonly string[]).includes(o.status),
    );
  }
  return orders.filter((o) => o.status === filter);
}

export function groupOrdersByStatus(
  orders: OrderDto[],
): Record<OrderStatus, OrderDto[]> {
  const groups = {} as Record<OrderStatus, OrderDto[]>;
  for (const status of Object.keys(ORDER_STATUS_LABELS_FA) as OrderStatus[]) {
    groups[status] = [];
  }
  for (const order of orders) {
    groups[order.status].push(order);
  }
  return groups;
}

export function summarizeLinesFa(order: OrderDto, max = 2): string {
  const parts = order.lines.slice(0, max).map((line) => {
    return `${line.productName} × ${line.quantity}`;
  });
  if (order.lines.length > max) {
    parts.push(`+${order.lines.length - max}`);
  }
  return parts.join(" · ");
}
