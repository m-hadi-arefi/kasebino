/**
 * In-memory OrderRepository for unit tests / local wiring until Drizzle.
 */

import type { OrderRepository } from "../../domain/repositories.js";
import type { Order, OrderStatus } from "../../domain/order.js";

function cloneOrder(order: Order): Order {
  return {
    ...order,
    lines: order.lines.map((line) => ({ ...line })),
  };
}

export class InMemoryOrderRepository implements OrderRepository {
  private readonly byId = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.byId.set(order.id, cloneOrder(order));
  }

  async update(order: Order): Promise<void> {
    this.byId.set(order.id, cloneOrder(order));
  }

  async findById(id: string): Promise<Order | null> {
    const found = this.byId.get(id);
    return found ? cloneOrder(found) : null;
  }

  async findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Order | null> {
    for (const order of this.byId.values()) {
      if (
        order.merchantId === merchantId &&
        order.idempotencyKey === idempotencyKey
      ) {
        return cloneOrder(order);
      }
    }
    return null;
  }

  async listByStore(input: {
    merchantId: string;
    storeId: string;
    status?: OrderStatus;
    limit?: number;
  }): Promise<Order[]> {
    const limit = input.limit ?? 100;
    const out: Order[] = [];
    for (const order of this.byId.values()) {
      if (order.merchantId !== input.merchantId) continue;
      if (order.storeId !== input.storeId) continue;
      if (input.status !== undefined && order.status !== input.status) continue;
      out.push(cloneOrder(order));
      if (out.length >= limit) break;
    }
    return out;
  }

  async listByMembership(input: {
    merchantId: string;
    storeId: string;
    membershipId: string;
    limit?: number;
  }): Promise<Order[]> {
    const limit = input.limit ?? 50;
    const out: Order[] = [];
    for (const order of this.byId.values()) {
      if (order.merchantId !== input.merchantId) continue;
      if (order.storeId !== input.storeId) continue;
      if (order.membershipId !== input.membershipId) continue;
      out.push(cloneOrder(order));
      if (out.length >= limit) break;
    }
    return out.sort(
      (a, b) => b.pendingPaymentAt.getTime() - a.pendingPaymentAt.getTime(),
    );
  }

  async listByStatus(input: {
    status: OrderStatus;
    merchantId?: string;
    storeId?: string;
    limit?: number;
  }): Promise<Order[]> {
    const limit = input.limit ?? 100;
    const out: Order[] = [];
    for (const order of this.byId.values()) {
      if (order.status !== input.status) continue;
      if (
        input.merchantId !== undefined &&
        order.merchantId !== input.merchantId
      ) {
        continue;
      }
      if (input.storeId !== undefined && order.storeId !== input.storeId) {
        continue;
      }
      out.push(cloneOrder(order));
      if (out.length >= limit) break;
    }
    return out;
  }
}
