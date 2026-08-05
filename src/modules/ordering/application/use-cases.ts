import { randomUUID } from "node:crypto";

import {
  cancelOrder,
  completeOrder,
  createPendingOrder,
  markOrderPaid,
  markOrderPickedUp,
  markOrderReadyForPickup,
  orderCanceledEvent,
  orderCompletedEvent,
  orderCreatedEvent,
  orderPaidEvent,
  orderPickedUpEvent,
  orderPreparingEvent,
  orderReadyForPickupEvent,
  orderRefundedEvent,
  refundOrder,
  shouldAutoCancelUnpaid,
  shouldExpireReadyHold,
  startOrderPreparing,
  type CreateOrderLineInput,
  type Order,
  type OrderRepository,
  type OrderStatus,
} from "../domain/index.js";
import { OrderingDomainError } from "./errors.js";
import type {
  InventoryReleasePort,
  InventoryReservePort,
  PaymentConfirmPort,
} from "./ports.js";
import {
  createStubInventoryReleasePort,
  createStubInventoryReservePort,
  createStubPaymentConfirmPort,
} from "./ports.js";

export type OrderingUseCaseDeps = {
  orders: OrderRepository;
  inventoryReserve?: InventoryReservePort;
  inventoryRelease?: InventoryReleasePort;
  paymentConfirm?: PaymentConfirmPort;
  now?: () => Date;
  idFactory?: () => string;
};

export type CreateOrderInput = {
  merchantId: string;
  storeId: string;
  membershipId?: string | null;
  customerId?: string | null;
  lines: CreateOrderLineInput[];
  idempotencyKey: string;
  fulfillmentMode?: string;
};

export type OrderIdInput = {
  orderId: string;
};

export type CancelOrderInput = {
  orderId: string;
  reason?: string;
};

function mapDomainThrow(error: unknown): never {
  if (error instanceof OrderingDomainError) throw error;
  if (error instanceof Error) {
    switch (error.message) {
      case "INVALID_QUANTITY":
        throw new OrderingDomainError("INVALID_QUANTITY");
      case "INVALID_PRICE":
        throw new OrderingDomainError("INVALID_PRICE");
      case "EMPTY_LINES":
      case "INVALID_PRODUCT_NAME":
        throw new OrderingDomainError("INVALID_LINES");
      case "IDEMPOTENCY_REQUIRED":
        throw new OrderingDomainError("IDEMPOTENCY_REQUIRED");
      case "INVALID_TENANT":
        throw new OrderingDomainError("INVALID_MERCHANT");
      case "INVALID_TRANSITION":
        throw new OrderingDomainError("INVALID_TRANSITION");
      default:
        if (/pickup-only/i.test(error.message)) {
          throw new OrderingDomainError("DELIVERY_FORBIDDEN");
        }
    }
  }
  throw error;
}

function requireIds(merchantId: string, storeId: string): void {
  if (!merchantId.trim()) throw new OrderingDomainError("INVALID_MERCHANT");
  if (!storeId.trim()) throw new OrderingDomainError("INVALID_STORE");
}

async function requireOrder(
  orders: OrderRepository,
  orderId: string,
): Promise<Order> {
  const order = await orders.findById(orderId);
  if (!order) throw new OrderingDomainError("ORDER_NOT_FOUND");
  return order;
}

function moneyString(amount: bigint): string {
  return amount.toString();
}

export type OrderingUseCases = ReturnType<typeof createOrderingUseCases>;

export function createOrderingUseCases(deps: OrderingUseCaseDeps) {
  const nowFn = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());
  const inventoryReserve =
    deps.inventoryReserve ?? createStubInventoryReservePort();
  const inventoryRelease =
    deps.inventoryRelease ?? createStubInventoryReleasePort();
  const paymentConfirm =
    deps.paymentConfirm ?? createStubPaymentConfirmPort();

  return {
    async createOrder(input: CreateOrderInput) {
      requireIds(input.merchantId, input.storeId);

      const existing = await deps.orders.findByIdempotencyKey(
        input.merchantId,
        input.idempotencyKey,
      );
      if (existing) {
        return { order: existing, created: false, event: null };
      }

      let order: Order;
      try {
        order = createPendingOrder({
          id: idFactory(),
          merchantId: input.merchantId,
          storeId: input.storeId,
          membershipId: input.membershipId ?? null,
          customerId: input.customerId ?? null,
          lines: input.lines,
          idempotencyKey: input.idempotencyKey,
          ...(input.fulfillmentMode !== undefined
            ? { fulfillmentMode: input.fulfillmentMode }
            : {}),
          now: nowFn(),
        });
      } catch (error) {
        mapDomainThrow(error);
      }

      await deps.orders.save(order);
      const event = orderCreatedEvent({
        orderId: order.id,
        merchantId: order.merchantId,
        storeId: order.storeId,
        membershipId: order.membershipId,
        customerId: order.customerId,
        totalAmountMinor: moneyString(order.totalAmountMinor),
        status: order.status,
        fulfillmentMode: "pickup",
        occurredAt: order.createdAt,
      });

      return { order, created: true, event };
    },

    async markPaid(input: OrderIdInput & { paymentReference?: string }) {
      const order = await requireOrder(deps.orders, input.orderId);
      const at = nowFn();

      const payment = await paymentConfirm.confirmOrderPayment({
        orderId: order.id,
        merchantId: order.merchantId,
        storeId: order.storeId,
        amountMinor: order.totalAmountMinor,
        ...(input.paymentReference !== undefined
          ? { paymentReference: input.paymentReference }
          : {}),
      });
      if (!payment.confirmed) {
        throw new OrderingDomainError("PAYMENT_NOT_CONFIRMED");
      }

      try {
        markOrderPaid(order, at);
      } catch (error) {
        mapDomainThrow(error);
      }

      await inventoryReserve.reserveForOrder({
        orderId: order.id,
        merchantId: order.merchantId,
        storeId: order.storeId,
        lines: order.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        sameTransaction: true,
      });

      await deps.orders.update(order);
      return {
        order,
        paymentId: payment.paymentId,
        event: orderPaidEvent({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          totalAmountMinor: moneyString(order.totalAmountMinor),
          paymentId: payment.paymentId,
          occurredAt: at,
        }),
      };
    },

    async startPreparing(input: OrderIdInput) {
      const order = await requireOrder(deps.orders, input.orderId);
      const at = nowFn();
      try {
        startOrderPreparing(order, at);
      } catch (error) {
        mapDomainThrow(error);
      }
      await deps.orders.update(order);
      return {
        order,
        event: orderPreparingEvent({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          occurredAt: at,
        }),
      };
    },

    async markReadyForPickup(input: OrderIdInput) {
      const order = await requireOrder(deps.orders, input.orderId);
      const at = nowFn();
      try {
        markOrderReadyForPickup(order, at);
      } catch (error) {
        mapDomainThrow(error);
      }
      await deps.orders.update(order);
      return {
        order,
        event: orderReadyForPickupEvent({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          membershipId: order.membershipId,
          customerId: order.customerId,
          occurredAt: at,
        }),
      };
    },

    async markPickedUp(input: OrderIdInput) {
      const order = await requireOrder(deps.orders, input.orderId);
      const at = nowFn();
      try {
        markOrderPickedUp(order, at);
      } catch (error) {
        mapDomainThrow(error);
      }
      await deps.orders.update(order);
      return {
        order,
        event: orderPickedUpEvent({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          occurredAt: at,
        }),
      };
    },

    async completeOrder(input: OrderIdInput) {
      const order = await requireOrder(deps.orders, input.orderId);
      const at = nowFn();
      try {
        completeOrder(order, at);
      } catch (error) {
        mapDomainThrow(error);
      }
      await deps.orders.update(order);
      return {
        order,
        event: orderCompletedEvent({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          occurredAt: at,
        }),
      };
    },

    async cancelOrder(input: CancelOrderInput) {
      const order = await requireOrder(deps.orders, input.orderId);
      const previousStatus = order.status;
      const at = nowFn();
      const wasPaid = order.paidAt !== null;
      try {
        cancelOrder(order, input.reason, at);
      } catch (error) {
        mapDomainThrow(error);
      }

      if (wasPaid) {
        await inventoryRelease.releaseForOrder({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          lines: order.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        });
      }

      await deps.orders.update(order);
      return {
        order,
        event: orderCanceledEvent({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          previousStatus,
          reason: order.cancelReason,
          auto: false,
          occurredAt: at,
        }),
      };
    },

    async refundOrder(input: OrderIdInput) {
      const order = await requireOrder(deps.orders, input.orderId);
      if (order.paidAt === null && order.status !== "refunded") {
        throw new OrderingDomainError("REFUND_REQUIRES_PAYMENT");
      }
      const at = nowFn();
      const previousStatus = order.status;
      try {
        refundOrder(order, at);
      } catch (error) {
        mapDomainThrow(error);
      }

      if (previousStatus !== "cancelled") {
        await inventoryRelease.releaseForOrder({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          lines: order.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        });
      }

      await deps.orders.update(order);
      return {
        order,
        event: orderRefundedEvent({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          totalAmountMinor: moneyString(order.totalAmountMinor),
          occurredAt: at,
        }),
      };
    },

    /**
     * Job use case: pending_payment → cancelled after 30 minutes (ADR-091).
     * Scheduler → ADR-035.
     */
    async cancelUnpaidExpiredOrders(options?: {
      merchantId?: string;
      storeId?: string;
      limit?: number;
    }) {
      const at = nowFn();
      const pending = await deps.orders.listByStatus({
        status: "pending_payment",
        ...(options?.merchantId !== undefined
          ? { merchantId: options.merchantId }
          : {}),
        ...(options?.storeId !== undefined ? { storeId: options.storeId } : {}),
        limit: options?.limit ?? 100,
      });

      const cancelled: Order[] = [];
      for (const order of pending) {
        if (!shouldAutoCancelUnpaid(order, at)) continue;
        const previousStatus: OrderStatus = order.status;
        try {
          cancelOrder(order, "unpaid_timeout", at);
        } catch {
          continue;
        }
        await deps.orders.update(order);
        cancelled.push(order);
        void previousStatus;
      }
      return { cancelledCount: cancelled.length, orders: cancelled };
    },

    /**
     * Job use case: ready_for_pickup hold ≥24h → cancelled; refund is manual.
     */
    async expireReadyForPickupHolds(options?: {
      merchantId?: string;
      storeId?: string;
      limit?: number;
    }) {
      const at = nowFn();
      const ready = await deps.orders.listByStatus({
        status: "ready_for_pickup",
        ...(options?.merchantId !== undefined
          ? { merchantId: options.merchantId }
          : {}),
        ...(options?.storeId !== undefined ? { storeId: options.storeId } : {}),
        limit: options?.limit ?? 100,
      });

      const expired: Order[] = [];
      for (const order of ready) {
        if (!shouldExpireReadyHold(order, at)) continue;
        try {
          cancelOrder(order, "ready_hold_expired", at);
        } catch {
          continue;
        }
        await inventoryRelease.releaseForOrder({
          orderId: order.id,
          merchantId: order.merchantId,
          storeId: order.storeId,
          lines: order.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        });
        await deps.orders.update(order);
        expired.push(order);
      }
      return { expiredCount: expired.length, orders: expired };
    },

    async getOrder(input: OrderIdInput) {
      return requireOrder(deps.orders, input.orderId);
    },

    async listStoreOrders(input: {
      merchantId: string;
      storeId: string;
      status?: OrderStatus;
      limit?: number;
    }) {
      requireIds(input.merchantId, input.storeId);
      return deps.orders.listByStore(input);
    },
  };
}
