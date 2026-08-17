/**
 * Pickup timer helpers — ADR-091 defaults via mvp-policies.
 */

import {
  PICKUP_TIMER_POLICY,
  readyHoldShouldExpire,
  unpaidOrderShouldAutoCancel,
} from "../../../shared/contracts/mvp-policies/index.js";
import type { Order } from "./order.js";

export { PICKUP_TIMER_POLICY };

export function unpaidOrderAgeMinutes(order: Order, now: Date): number {
  const ms = now.getTime() - order.pendingPaymentAt.getTime();
  return ms / 60_000;
}

export function readyHoldAgeHours(order: Order, now: Date): number {
  if (!order.readyForPickupAt) return 0;
  const ms = now.getTime() - order.readyForPickupAt.getTime();
  return ms / 3_600_000;
}

export function shouldAutoCancelUnpaid(order: Order, now: Date): boolean {
  if (order.status !== "pending_payment") return false;
  return unpaidOrderShouldAutoCancel(unpaidOrderAgeMinutes(order, now));
}

/**
 * Ready hold expired → staff cancel workflow; never auto-refund (ADR-091).
 */
export function shouldExpireReadyHold(order: Order, now: Date): boolean {
  if (order.status !== "ready_for_pickup") return false;
  return readyHoldShouldExpire(readyHoldAgeHours(order, now));
}
