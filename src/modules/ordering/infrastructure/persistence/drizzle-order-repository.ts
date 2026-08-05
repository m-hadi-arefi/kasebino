/**
 * Drizzle OrderRepository (ADR-093 / ADR-011).
 */

import { and, desc, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  orderLines,
  orders,
} from "../../../../infrastructure/database/schema/orders.js";
import {
  assertMerchantId,
  assertStoreId,
  notDeleted,
} from "../../../../infrastructure/persistence/helpers.js";
import type {
  Order,
  OrderFulfillmentMode,
  OrderLine,
  OrderStatus,
} from "../../domain/order.js";
import type { OrderRepository } from "../../domain/repositories.js";

type OrderRow = typeof orders.$inferSelect;
type LineRow = typeof orderLines.$inferSelect;

function toLine(row: LineRow): OrderLine {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    quantity: row.quantity,
    unitPriceMinor: row.unitPriceMinor,
    lineTotalMinor: row.lineTotalMinor,
  };
}

function toOrder(row: OrderRow, lines: OrderLine[]): Order {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    membershipId: row.membershipId,
    customerId: row.customerId,
    fulfillmentMode: row.fulfillmentMode as OrderFulfillmentMode,
    status: row.status as OrderStatus,
    lines,
    totalAmountMinor: row.totalAmountMinor,
    idempotencyKey: row.idempotencyKey,
    pendingPaymentAt: row.pendingPaymentAt,
    paidAt: row.paidAt,
    preparingAt: row.preparingAt,
    readyForPickupAt: row.readyForPickupAt,
    pickedUpAt: row.pickedUpAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    refundedAt: row.refundedAt,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export class DrizzleOrderRepository implements OrderRepository {
  constructor(private readonly db: DrizzleDb) {}

  private async loadLines(orderId: string): Promise<OrderLine[]> {
    const rows = await this.db
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, orderId));
    return rows.map(toLine);
  }

  async save(order: Order): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: order.id,
        merchantId: order.merchantId,
        storeId: order.storeId,
        membershipId: order.membershipId,
        customerId: order.customerId,
        fulfillmentMode: order.fulfillmentMode,
        status: order.status,
        totalAmountMinor: order.totalAmountMinor,
        idempotencyKey: order.idempotencyKey,
        pendingPaymentAt: order.pendingPaymentAt,
        paidAt: order.paidAt,
        preparingAt: order.preparingAt,
        readyForPickupAt: order.readyForPickupAt,
        pickedUpAt: order.pickedUpAt,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
        refundedAt: order.refundedAt,
        cancelReason: order.cancelReason,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deletedAt: order.deletedAt,
      });
      if (order.lines.length > 0) {
        await tx.insert(orderLines).values(
          order.lines.map((line) => ({
            id: line.id,
            orderId: order.id,
            merchantId: order.merchantId,
            storeId: order.storeId,
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
            lineTotalMinor: line.lineTotalMinor,
            createdAt: order.createdAt,
          })),
        );
      }
    });
  }

  async update(order: Order): Promise<void> {
    await this.db
      .update(orders)
      .set({
        membershipId: order.membershipId,
        customerId: order.customerId,
        status: order.status,
        totalAmountMinor: order.totalAmountMinor,
        paidAt: order.paidAt,
        preparingAt: order.preparingAt,
        readyForPickupAt: order.readyForPickupAt,
        pickedUpAt: order.pickedUpAt,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
        refundedAt: order.refundedAt,
        cancelReason: order.cancelReason,
        updatedAt: order.updatedAt,
        deletedAt: order.deletedAt,
      })
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.merchantId, order.merchantId),
          notDeleted(orders.deletedAt),
        ),
      );
  }

  async findById(id: string): Promise<Order | null> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), notDeleted(orders.deletedAt)))
      .limit(1);
    if (!rows[0]) return null;
    return toOrder(rows[0], await this.loadLines(id));
  }

  async findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Order | null> {
    assertMerchantId(merchantId);
    const rows = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.merchantId, merchantId),
          eq(orders.idempotencyKey, idempotencyKey),
          notDeleted(orders.deletedAt),
        ),
      )
      .limit(1);
    if (!rows[0]) return null;
    return toOrder(rows[0], await this.loadLines(rows[0].id));
  }

  async listByStore(input: {
    merchantId: string;
    storeId: string;
    status?: OrderStatus;
    limit?: number;
  }): Promise<Order[]> {
    assertMerchantId(input.merchantId);
    assertStoreId(input.storeId);
    const limit = input.limit ?? 100;
    const conditions = [
      eq(orders.merchantId, input.merchantId),
      eq(orders.storeId, input.storeId),
      notDeleted(orders.deletedAt),
    ];
    if (input.status !== undefined) {
      conditions.push(eq(orders.status, input.status));
    }
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
    const result: Order[] = [];
    for (const row of rows) {
      result.push(toOrder(row, await this.loadLines(row.id)));
    }
    return result;
  }

  async listByMembership(input: {
    merchantId: string;
    storeId: string;
    membershipId: string;
    limit?: number;
  }): Promise<Order[]> {
    assertMerchantId(input.merchantId);
    assertStoreId(input.storeId);
    const limit = input.limit ?? 50;
    const rows = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.merchantId, input.merchantId),
          eq(orders.storeId, input.storeId),
          eq(orders.membershipId, input.membershipId),
          notDeleted(orders.deletedAt),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(limit);
    const result: Order[] = [];
    for (const row of rows) {
      result.push(toOrder(row, await this.loadLines(row.id)));
    }
    return result;
  }

  async listByStatus(input: {
    status: OrderStatus;
    merchantId?: string;
    storeId?: string;
    limit?: number;
  }): Promise<Order[]> {
    const limit = input.limit ?? 100;
    const conditions = [
      eq(orders.status, input.status),
      notDeleted(orders.deletedAt),
    ];
    if (input.merchantId !== undefined) {
      assertMerchantId(input.merchantId);
      conditions.push(eq(orders.merchantId, input.merchantId));
    }
    if (input.storeId !== undefined) {
      assertStoreId(input.storeId);
      conditions.push(eq(orders.storeId, input.storeId));
    }
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
    const result: Order[] = [];
    for (const row of rows) {
      result.push(toOrder(row, await this.loadLines(row.id)));
    }
    return result;
  }
}
