/**
 * Order repository port (ADR-011). No Drizzle types across boundary.
 */

import type { Order, OrderStatus } from "./order.js";

export type OrderRepository = {
  save(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Order | null>;
  listByStore(input: {
    merchantId: string;
    storeId: string;
    status?: OrderStatus;
    limit?: number;
  }): Promise<Order[]>;
  listByStatus(input: {
    status: OrderStatus;
    merchantId?: string;
    storeId?: string;
    limit?: number;
  }): Promise<Order[]>;
};
