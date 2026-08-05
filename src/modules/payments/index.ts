/**
 * Payments bounded context — ADR-012 Payment Domain + ADR-102 HTTP surface.
 * PaymentGateway port + sandbox/mock (ADR-084 Proposed). Fees inactive (ADR-091).
 * OrderPaid via Ordering PaymentConfirmPort adapter. API/UI → ARD-012/034.
 *
 * ## Production PSP adapter swap (ADR-084)
 * HTTP routes stay stable: `/api/v1/payments/intents`, `/webhooks/{provider}`,
 * `/{id}/refunds`, and (dev-only) `/{id}/sandbox/confirm`.
 * Swap only the `PaymentGateway` implementation injected in
 * `createApiContext({ paymentGateway })` — do not change handler shapes.
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

import type { PaymentRepository } from "./domain/repositories.js";
import { SandboxPaymentGateway } from "./infrastructure/gateway/sandbox-payment-gateway.js";
import { createSandboxPaymentConfirmPort } from "./infrastructure/ordering/sandbox-payment-confirm-adapter.js";
import type { PaymentConfirmPortShape } from "./infrastructure/ordering/sandbox-payment-confirm-adapter.js";

/**
 * Sandbox wiring for Ordering markPaid (no real PSP).
 * Requires an injected PaymentRepository — production uses Drizzle (ADR-093).
 * Unit tests may pass InMemoryPaymentRepository.
 */
export function createDefaultSandboxPaymentConfirmPort(opts: {
  payments: PaymentRepository;
  now?: () => Date;
  idFactory?: () => string;
}): PaymentConfirmPortShape {
  return createSandboxPaymentConfirmPort({
    payments: opts.payments,
    gateway: new SandboxPaymentGateway(),
    ...(opts.now ? { now: opts.now } : {}),
    ...(opts.idFactory ? { idFactory: opts.idFactory } : {}),
  });
}