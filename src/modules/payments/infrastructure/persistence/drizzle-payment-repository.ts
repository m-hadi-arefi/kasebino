/**
 * Drizzle PaymentRepository (ADR-093 / ADR-012).
 */

import { and, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { payments } from "../../../../infrastructure/database/schema/payments.js";
import { assertMerchantId } from "../../../../infrastructure/persistence/helpers.js";
import type { PaymentStatus } from "../../domain/contracts/index.js";
import type { PaymentIntent } from "../../domain/payment-intent.js";
import type { PaymentRepository } from "../../domain/repositories.js";

type Row = typeof payments.$inferSelect;

function toPayment(row: Row): PaymentIntent {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    orderId: row.orderId,
    amountMinor: row.amountMinor,
    currency: "IRR",
    status: row.status as PaymentStatus,
    providerId: row.providerId,
    providerRef: row.providerRef,
    idempotencyKey: row.idempotencyKey,
    feeChargedMinor: row.feeChargedMinor,
    failureCode: row.failureCode,
    paidAt: row.paidAt,
    refundedAt: row.refundedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(payment: PaymentIntent): Promise<void> {
    await this.db.insert(payments).values({
      id: payment.id,
      merchantId: payment.merchantId,
      storeId: payment.storeId,
      orderId: payment.orderId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      status: payment.status,
      providerId: payment.providerId,
      providerRef: payment.providerRef,
      idempotencyKey: payment.idempotencyKey,
      feeChargedMinor: payment.feeChargedMinor,
      failureCode: payment.failureCode,
      paidAt: payment.paidAt,
      refundedAt: payment.refundedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  }

  async update(payment: PaymentIntent): Promise<void> {
    await this.db
      .update(payments)
      .set({
        status: payment.status,
        providerRef: payment.providerRef,
        feeChargedMinor: payment.feeChargedMinor,
        failureCode: payment.failureCode,
        paidAt: payment.paidAt,
        refundedAt: payment.refundedAt,
        updatedAt: payment.updatedAt,
      })
      .where(
        and(
          eq(payments.id, payment.id),
          eq(payments.merchantId, payment.merchantId),
        ),
      );
  }

  async findById(id: string): Promise<PaymentIntent | null> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return rows[0] ? toPayment(rows[0]) : null;
  }

  async findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<PaymentIntent | null> {
    assertMerchantId(merchantId);
    const rows = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.merchantId, merchantId),
          eq(payments.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? toPayment(rows[0]) : null;
  }

  async findByOrderId(
    merchantId: string,
    orderId: string,
  ): Promise<PaymentIntent | null> {
    assertMerchantId(merchantId);
    const rows = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.merchantId, merchantId),
          eq(payments.orderId, orderId),
        ),
      )
      .limit(1);
    return rows[0] ? toPayment(rows[0]) : null;
  }

  async findByProviderRef(
    providerRef: string,
  ): Promise<PaymentIntent | null> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerRef, providerRef))
      .limit(1);
    return rows[0] ? toPayment(rows[0]) : null;
  }
}
