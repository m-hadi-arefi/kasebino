import { randomUUID } from "node:crypto";



import { FEE_POLICY } from "../../../payments-domain/index.js";
import {
  createPaymentIntent,
  markPaymentFailed,
  markPaymentProcessing,
  markPaymentRefunded,
  markPaymentSucceeded,
  paymentFailedEvent,
  paymentIntentCreatedEvent,
  paymentRefundedEvent,
  paymentSucceededEvent,
  type PaymentIntent,
  type PaymentRepository,
} from "../domain/index.js";
import { PaymentsDomainError } from "./errors.js";
import type { PaymentGateway } from "./ports/payment-gateway.js";
export { signSandboxWebhook, timingSafeEqualHex } from "./webhook-crypto.js";

/**
 * Sandbox confirm HTTP is local/dev only (ADR-102).
 * Requires MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM=1 and non-production MOS_ENV.
 */
export function isSandboxPaymentConfirmAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const flag = (env.MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM ?? "").trim().toLowerCase();
  if (flag !== "1" && flag !== "true") return false;
  const mos = (env.MOS_ENV ?? "").trim().toLowerCase();
  if (mos === "production" || mos === "staging") return false;
  const node = (env.NODE_ENV ?? "").trim().toLowerCase();
  if (mos === "local") return true;
  if (!mos && (node === "development" || node === "test" || node === "")) {
    return true;
  }
  return node === "development" || node === "test";
}



export type PaymentsUseCaseDeps = {
  payments: PaymentRepository;
  gateway: PaymentGateway;
  now?: () => Date;
  idFactory?: () => string;
};



export type CreateIntentInput = {
  merchantId: string;
  storeId: string;
  orderId: string;
  amountMinor: bigint;
  idempotencyKey: string;
  callbackUrl?: string;
};



export type ConfirmSandboxPaymentInput = {
  paymentId: string;
  outcome?: "succeeded" | "failed";
};



export type HandleWebhookInput = {
  provider: string;
  rawBody: string;
  signatureHeader: string | null;
  /** Parsed fields after signature verification. */
  paymentId: string;
  providerRef: string;
  outcome: "succeeded" | "failed";
  failureCode?: string;
};



export type RefundPaymentInput = {
  paymentId: string;
};



function mapDomainThrow(error: unknown): never {
  if (error instanceof PaymentsDomainError) throw error;
  if (error instanceof Error) {
    switch (error.message) {
      case "INVALID_MERCHANT":
        throw new PaymentsDomainError("INVALID_MERCHANT");
      case "INVALID_STORE":
        throw new PaymentsDomainError("INVALID_STORE");
      case "INVALID_ORDER":
        throw new PaymentsDomainError("INVALID_ORDER");
      case "INVALID_AMOUNT":
        throw new PaymentsDomainError("INVALID_AMOUNT");
      case "IDEMPOTENCY_REQUIRED":
        throw new PaymentsDomainError("IDEMPOTENCY_REQUIRED");
      case "INVALID_TRANSITION":
        throw new PaymentsDomainError("INVALID_TRANSITION");
      case "INVALID_PROVIDER_REF":
        throw new PaymentsDomainError("INVALID_PROVIDER_REF");
      default:
        break;
    }
  }
  throw error;
}



function requireIds(merchantId: string, storeId: string): void {
  if (!merchantId.trim()) throw new PaymentsDomainError("INVALID_MERCHANT");
  if (!storeId.trim()) throw new PaymentsDomainError("INVALID_STORE");
}



async function requirePayment(
  payments: PaymentRepository,
  paymentId: string,
): Promise<PaymentIntent> {
  const payment = await payments.findById(paymentId);
  if (!payment) throw new PaymentsDomainError("PAYMENT_NOT_FOUND");
  return payment;
}



function moneyString(amount: bigint): string {
  return amount.toString();
}



/**
 * Platform tx fee for online payment — always 0 while Kerman pilot fees inactive.
 */
export function computePilotFeeMinor(amountMinor: bigint): bigint {
  if (!FEE_POLICY.active) return 0n;
  return FEE_POLICY.computeTxFeeMinor(amountMinor);
}



export type PaymentsUseCases = ReturnType<typeof createPaymentsUseCases>;



export function createPaymentsUseCases(deps: PaymentsUseCaseDeps) {
  const nowFn = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());



  return {
    async createIntent(input: CreateIntentInput) {
      requireIds(input.merchantId, input.storeId);
      if (!input.orderId.trim()) {
        throw new PaymentsDomainError("INVALID_ORDER");
      }
      if (input.amountMinor <= 0n) {
        throw new PaymentsDomainError("INVALID_AMOUNT");
      }
      if (!input.idempotencyKey.trim()) {
        throw new PaymentsDomainError("IDEMPOTENCY_REQUIRED");
      }



      const existing = await deps.payments.findByIdempotencyKey(
        input.merchantId,
        input.idempotencyKey,
      );
      if (existing) {
        return {
          payment: existing,
          created: false,
          event: null,
          redirectUrl: null,
        };
      }



      let payment: PaymentIntent;
      try {
        payment = createPaymentIntent({
          id: idFactory(),
          merchantId: input.merchantId,
          storeId: input.storeId,
          orderId: input.orderId,
          amountMinor: input.amountMinor,
          idempotencyKey: input.idempotencyKey,
          providerId: deps.gateway.providerId,
          now: nowFn(),
        });
      } catch (error) {
        mapDomainThrow(error);
      }



      payment.feeChargedMinor = computePilotFeeMinor(payment.amountMinor);



      const gatewayResult = await deps.gateway.createIntent({
        paymentId: payment.id,
        merchantId: payment.merchantId,
        storeId: payment.storeId,
        orderId: payment.orderId,
        amountMinor: payment.amountMinor,
        currency: "IRR",
        ...(input.callbackUrl !== undefined
          ? { callbackUrl: input.callbackUrl }
          : {}),
      });



      try {
        markPaymentProcessing(payment, gatewayResult.providerRef, nowFn());
      } catch (error) {
        mapDomainThrow(error);
      }



      await deps.payments.save(payment);
      const event = paymentIntentCreatedEvent({
        paymentId: payment.id,
        merchantId: payment.merchantId,
        storeId: payment.storeId,
        orderId: payment.orderId,
        amountMinor: moneyString(payment.amountMinor),
        status: payment.status,
        providerId: payment.providerId,
        occurredAt: payment.createdAt,
      });



      return {
        payment,
        created: true,
        event,
        redirectUrl: gatewayResult.redirectUrl,
      };
    },



    /**
     * Sandbox / staff confirm path (also used by PaymentConfirmPort adapter).
     */
    async confirmSandboxPayment(input: ConfirmSandboxPaymentInput) {
      const payment = await requirePayment(deps.payments, input.paymentId);
      const at = nowFn();
      const providerRef =
        payment.providerRef ?? `sandbox-confirm-${payment.id}`;



      const gatewayResult = await deps.gateway.confirmPayment({
        providerRef,
        outcome: input.outcome ?? "succeeded",
      });



      if (!gatewayResult.confirmed) {
        try {
          markPaymentFailed(
            payment,
            gatewayResult.failureCode ?? "SANDBOX_DECLINED",
            at,
          );
        } catch (error) {
          mapDomainThrow(error);
        }
        await deps.payments.update(payment);
        return {
          payment,
          confirmed: false as const,
          event: paymentFailedEvent({
            paymentId: payment.id,
            merchantId: payment.merchantId,
            storeId: payment.storeId,
            orderId: payment.orderId,
            failureCode: payment.failureCode ?? "SANDBOX_DECLINED",
            occurredAt: at,
          }),
        };
      }



      try {
        markPaymentSucceeded(payment, at, {
          providerRef: gatewayResult.providerRef,
          feeChargedMinor: computePilotFeeMinor(payment.amountMinor),
        });
      } catch (error) {
        mapDomainThrow(error);
      }



      await deps.payments.update(payment);
      return {
        payment,
        confirmed: true as const,
        event: paymentSucceededEvent({
          paymentId: payment.id,
          merchantId: payment.merchantId,
          storeId: payment.storeId,
          orderId: payment.orderId,
          amountMinor: moneyString(payment.amountMinor),
          providerRef: payment.providerRef,
          occurredAt: at,
        }),
      };
    },



    async handleWebhook(input: HandleWebhookInput) {
      const valid = deps.gateway.verifyWebhookSignature({
        provider: input.provider,
        rawBody: input.rawBody,
        signatureHeader: input.signatureHeader,
      });
      if (!valid) {
        throw new PaymentsDomainError("WEBHOOK_SIGNATURE_INVALID");
      }

      const payment = await requirePayment(deps.payments, input.paymentId);
      const at = nowFn();

      /** Idempotent: already-succeeded payment + success outcome. */
      if (input.outcome === "succeeded" && payment.status === "succeeded") {
        return {
          payment,
          confirmed: true as const,
          event: null,
          alreadyProcessed: true as const,
        };
      }

      if (input.outcome === "failed" && payment.status === "failed") {
        return {
          payment,
          confirmed: false as const,
          event: null,
          alreadyProcessed: true as const,
        };
      }

      if (input.outcome === "failed") {
        try {
          markPaymentFailed(
            payment,
            input.failureCode ?? "WEBHOOK_FAILED",
            at,
          );
        } catch (error) {
          mapDomainThrow(error);
        }
        await deps.payments.update(payment);
        return {
          payment,
          confirmed: false as const,
          event: paymentFailedEvent({
            paymentId: payment.id,
            merchantId: payment.merchantId,
            storeId: payment.storeId,
            orderId: payment.orderId,
            failureCode: payment.failureCode ?? "WEBHOOK_FAILED",
            occurredAt: at,
          }),
          alreadyProcessed: false as const,
        };
      }

      try {
        markPaymentSucceeded(payment, at, {
          providerRef: input.providerRef,
          feeChargedMinor: computePilotFeeMinor(payment.amountMinor),
        });
      } catch (error) {
        mapDomainThrow(error);
      }
      await deps.payments.update(payment);
      return {
        payment,
        confirmed: true as const,
        event: paymentSucceededEvent({
          paymentId: payment.id,
          merchantId: payment.merchantId,
          storeId: payment.storeId,
          orderId: payment.orderId,
          amountMinor: moneyString(payment.amountMinor),
          providerRef: payment.providerRef,
          occurredAt: at,
        }),
        alreadyProcessed: false as const,
      };
    },



    async refundPayment(input: RefundPaymentInput) {
      const payment = await requirePayment(deps.payments, input.paymentId);
      if (payment.status !== "succeeded") {
        throw new PaymentsDomainError("INVALID_TRANSITION");
      }
      if (!payment.providerRef) {
        throw new PaymentsDomainError("INVALID_PROVIDER_REF");
      }



      const at = nowFn();
      const gatewayResult = await deps.gateway.refundPayment({
        providerRef: payment.providerRef,
        amountMinor: payment.amountMinor,
      });
      if (!gatewayResult.refunded) {
        throw new PaymentsDomainError("PAYMENT_NOT_CONFIRMED");
      }



      try {
        markPaymentRefunded(payment, at);
      } catch (error) {
        mapDomainThrow(error);
      }
      await deps.payments.update(payment);
      return {
        payment,
        event: paymentRefundedEvent({
          paymentId: payment.id,
          merchantId: payment.merchantId,
          storeId: payment.storeId,
          orderId: payment.orderId,
          amountMinor: moneyString(payment.amountMinor),
          occurredAt: at,
        }),
      };
    },



    async getPayment(paymentId: string) {
      return requirePayment(deps.payments, paymentId);
    },
  };
}
