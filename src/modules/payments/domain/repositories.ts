/**
 * Payment repository port (ADR-012). No Drizzle types across boundary.
 */

import type { PaymentIntent } from "./payment-intent.js";

export type PaymentRepository = {
  save(payment: PaymentIntent): Promise<void>;
  update(payment: PaymentIntent): Promise<void>;
  findById(id: string): Promise<PaymentIntent | null>;
  findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<PaymentIntent | null>;
  findByOrderId(
    merchantId: string,
    orderId: string,
  ): Promise<PaymentIntent | null>;
  findByProviderRef(providerRef: string): Promise<PaymentIntent | null>;
};
