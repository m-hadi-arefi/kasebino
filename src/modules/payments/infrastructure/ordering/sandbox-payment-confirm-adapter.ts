/**
 * Ordering PaymentConfirmPort adapter backed by PaymentGateway sandbox (ADR-012).
 * Structurally typed — does not import Ordering types (avoids circular deps).
 *
 * Creates or reuses a PaymentIntent for the order, confirms via sandbox,
 * and returns confirmed + paymentId for markPaid → OrderPaid.
 */



import { randomUUID } from "node:crypto";



import {
  createPaymentIntent,
  markPaymentProcessing,
  markPaymentSucceeded,
  type PaymentRepository,
} from "../../domain/index.js";
import { computePilotFeeMinor } from "../../application/use-cases.js";
import type { PaymentGateway } from "../../application/ports/payment-gateway.js";



export type PaymentConfirmPortShape = {
  confirmOrderPayment(input: {
    orderId: string;
    merchantId: string;
    storeId: string;
    amountMinor: bigint;
    paymentReference?: string;
  }): Promise<{ confirmed: boolean; paymentId: string }>;
};



export type SandboxPaymentConfirmDeps = {
  payments: PaymentRepository;
  gateway: PaymentGateway;
  now?: () => Date;
  idFactory?: () => string;
};



/**
 * Wire Ordering markPaid to sandbox PaymentGateway (no real PSP).
 */
export function createSandboxPaymentConfirmPort(
  deps: SandboxPaymentConfirmDeps,
): PaymentConfirmPortShape {
  const nowFn = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());



  return {
    async confirmOrderPayment(input) {
      const existing = await deps.payments.findByOrderId(
        input.merchantId,
        input.orderId,
      );



      let payment = existing;
      if (!payment) {
        payment = createPaymentIntent({
          id: idFactory(),
          merchantId: input.merchantId,
          storeId: input.storeId,
          orderId: input.orderId,
          amountMinor: input.amountMinor,
          idempotencyKey: `order-paid:${input.orderId}`,
          providerId: deps.gateway.providerId,
          now: nowFn(),
        });
        payment.feeChargedMinor = computePilotFeeMinor(payment.amountMinor);



        const gatewayIntent = await deps.gateway.createIntent({
          paymentId: payment.id,
          merchantId: payment.merchantId,
          storeId: payment.storeId,
          orderId: payment.orderId,
          amountMinor: payment.amountMinor,
          currency: "IRR",
        });
        markPaymentProcessing(
          payment,
          input.paymentReference ?? gatewayIntent.providerRef,
          nowFn(),
        );
        await deps.payments.save(payment);
      }



      if (payment.status === "succeeded") {
        return { confirmed: true, paymentId: payment.id };
      }



      const providerRef =
        payment.providerRef ??
        input.paymentReference ??
        `sandbox-${payment.id}`;



      const result = await deps.gateway.confirmPayment({
        providerRef,
        outcome: "succeeded",
      });



      if (!result.confirmed) {
        return { confirmed: false, paymentId: payment.id };
      }



      // Re-load mutable entity for update after possible clone from repo
      const fresh = (await deps.payments.findById(payment.id)) ?? payment;
      markPaymentSucceeded(fresh, nowFn(), {
        providerRef: result.providerRef,
        feeChargedMinor: computePilotFeeMinor(fresh.amountMinor),
      });
      await deps.payments.update(fresh);



      return { confirmed: true, paymentId: fresh.id };
    },
  };
}
