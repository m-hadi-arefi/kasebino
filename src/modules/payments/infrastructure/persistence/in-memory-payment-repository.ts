/**
 * In-memory PaymentRepository for unit tests / local wiring until Drizzle.
 */



import type { PaymentRepository } from "../../domain/repositories.js";
import type { PaymentIntent } from "../../domain/payment-intent.js";



function clonePayment(payment: PaymentIntent): PaymentIntent {
  return { ...payment };
}



export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly byId = new Map<string, PaymentIntent>();



  async save(payment: PaymentIntent): Promise<void> {
    this.byId.set(payment.id, clonePayment(payment));
  }



  async update(payment: PaymentIntent): Promise<void> {
    this.byId.set(payment.id, clonePayment(payment));
  }



  async findById(id: string): Promise<PaymentIntent | null> {
    const found = this.byId.get(id);
    return found ? clonePayment(found) : null;
  }



  async findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<PaymentIntent | null> {
    for (const payment of this.byId.values()) {
      if (
        payment.merchantId === merchantId &&
        payment.idempotencyKey === idempotencyKey
      ) {
        return clonePayment(payment);
      }
    }
    return null;
  }



  async findByOrderId(
    merchantId: string,
    orderId: string,
  ): Promise<PaymentIntent | null> {
    for (const payment of this.byId.values()) {
      if (payment.merchantId === merchantId && payment.orderId === orderId) {
        return clonePayment(payment);
      }
    }
    return null;
  }



  async findByProviderRef(
    providerRef: string,
  ): Promise<PaymentIntent | null> {
    for (const payment of this.byId.values()) {
      if (payment.providerRef === providerRef) {
        return clonePayment(payment);
      }
    }
    return null;
  }
}
