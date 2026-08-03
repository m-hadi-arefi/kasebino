/**
 * Payments bounded context — ADR-012 Payment Domain.
 * PaymentGateway port + sandbox/mock (ADR-084 Proposed). Fees inactive (ADR-091).
 * OrderPaid via Ordering PaymentConfirmPort adapter. API/UI → ARD-012/034.
 */



export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
export {
  FEE_POLICY,
  PAYMENTS_COPY_FA,
  PAYMENTS_DECISION,
  PAYMENT_STATUS_LABELS_FA,
  paymentStatusLabelFa,
} from "../../payments-domain/index.js";



import { InMemoryPaymentRepository } from "./infrastructure/persistence/in-memory-payment-repository.js";
import { SandboxPaymentGateway } from "./infrastructure/gateway/sandbox-payment-gateway.js";
import { createSandboxPaymentConfirmPort } from "./infrastructure/ordering/sandbox-payment-confirm-adapter.js";
import type { PaymentConfirmPortShape } from "./infrastructure/ordering/sandbox-payment-confirm-adapter.js";



/**
 * Default sandbox wiring for Ordering markPaid (no real PSP).
 * Prefer injecting a shared repository when integrating with payment intents.
 */
export function createDefaultSandboxPaymentConfirmPort(
  opts?: { now?: () => Date; idFactory?: () => string },
): PaymentConfirmPortShape {
  return createSandboxPaymentConfirmPort({
    payments: new InMemoryPaymentRepository(),
    gateway: new SandboxPaymentGateway(),
    ...(opts?.now ? { now: opts.now } : {}),
    ...(opts?.idFactory ? { idFactory: opts.idFactory } : {}),
  });
}
