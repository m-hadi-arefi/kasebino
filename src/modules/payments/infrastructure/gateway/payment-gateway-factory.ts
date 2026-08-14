/**
 * Payment Gateway Factory (Strategy Pattern).
 * Instantiates the appropriate PaymentGateway adapter based on environment variables or explicit options.
 * Allows easy switching between ZarinPal, Sandbox, or future payment service providers without changing application logic.
 */

import type { PaymentGateway } from "../../application/ports/payment-gateway.js";
import { SandboxPaymentGateway, type SandboxPaymentGatewayOptions } from "./sandbox-payment-gateway.js";
import { ZarinpalPaymentGateway, ZARINPAL_PROVIDER_ID, type ZarinpalPaymentGatewayOptions } from "./zarinpal-payment-gateway.js";

export type PaymentGatewayFactoryOptions = {
  provider?: string;
  sandboxOpts?: SandboxPaymentGatewayOptions;
  zarinpalOpts?: ZarinpalPaymentGatewayOptions;
  env?: NodeJS.ProcessEnv;
};

export function createPaymentGatewayFromEnv(
  opts?: PaymentGatewayFactoryOptions,
): PaymentGateway {
  const env = opts?.env ?? process.env;
  const provider = (
    opts?.provider ||
    env.MOS_PAYMENT_PROVIDER ||
    (env.ZARINPAL_MERCHANT_ID ? ZARINPAL_PROVIDER_ID : "sandbox")
  ).toLowerCase().trim();

  switch (provider) {
    case ZARINPAL_PROVIDER_ID:
    case "zarinpal":
      return new ZarinpalPaymentGateway(opts?.zarinpalOpts);

    case "sandbox":
    case "mock":
    default:
      return new SandboxPaymentGateway({
        ...(env.MOS_PAYMENTS_WEBHOOK_SECRET?.trim()
          ? { webhookSecret: env.MOS_PAYMENTS_WEBHOOK_SECRET.trim() }
          : {}),
        ...opts?.sandboxOpts,
      });
  }
}
