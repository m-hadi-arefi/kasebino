/**
 * ADR-123 — production composition env / adapter policy guards.
 * Fail-fast wiring only; no business logic (ADR-029).
 */

import {
  assertRequiredEnvInProduction,
  EnvConfigError,
  isProductionLike,
  resolveNodeEnv,
} from "../../env-secrets/index.js";
import {
  assertConsoleSmsAllowed,
  createCustomerSmsAdapter,
  createMerchantSmsAdapter,
  isConsoleSmsAdapter,
  resolveSmsRuntimeEnv,
} from "../auth/sms-adapter-factory.js";

/** Always required for production composition (Drizzle OLTP). */
export function assertDatabaseUrlForComposition(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    throw new EnvConfigError(
      "DATABASE_URL is required for application composition (ADR-123 / ADR-042).",
      ["DATABASE_URL"],
    );
  }
  return url;
}

/**
 * Production/staging: ADR-068 required boot keys.
 * All production-composition calls: DATABASE_URL present.
 */
export function assertProductionCompositionEnv(
  env: NodeJS.ProcessEnv = process.env,
): void {
  assertDatabaseUrlForComposition(env);
  assertRequiredEnvInProduction(env);
}

/**
 * Production config rejects Console SMS as the default adapter (ADR-095 / ADR-123).
 * Explicit MOS_FORCE_CONSOLE_SMS=1 only allowed in local/development.
 */
export function assertProductionSmsPolicy(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const smsEnv = resolveSmsRuntimeEnv({}, env);
  const forceConsole = (env.MOS_FORCE_CONSOLE_SMS ?? "").trim().toLowerCase();
  if (forceConsole === "1" || forceConsole === "true") {
    assertConsoleSmsAllowed(smsEnv);
  }

  const merchant = createMerchantSmsAdapter(smsEnv);
  const customer = createCustomerSmsAdapter(smsEnv);
  if (isConsoleSmsAdapter(merchant) || isConsoleSmsAdapter(customer)) {
    const nodeEnv = resolveNodeEnv(env);
    const mos = smsEnv.mosEnv.toLowerCase();
    if (
      isProductionLike(nodeEnv) ||
      mos === "production" ||
      mos === "staging"
    ) {
      throw new Error(
        "Console SMS adapter is forbidden as production default (ADR-123 / ADR-095).",
      );
    }
  }
}

/**
 * When MOS_ENV=production, sandbox payment gateway must be acknowledged
 * (not selected blindly). Confirm HTTP remains gated separately (ADR-102).
 * Real PSP wiring → ADR-084 / future.
 */
export function assertProductionPaymentGatewayPolicy(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const mos = (env.MOS_ENV ?? "").trim().toLowerCase();
  if (mos !== "production") return;

  const mode = (env.MOS_PAYMENTS_GATEWAY ?? "sandbox").trim().toLowerCase();
  const allowFlag = (env.MOS_ALLOW_SANDBOX_PAYMENT_GATEWAY ?? "")
    .trim()
    .toLowerCase();
  const allowSandbox = allowFlag === "1" || allowFlag === "true";

  if (mode === "sandbox" && !allowSandbox) {
    throw new Error(
      "Sandbox payment gateway requires MOS_ALLOW_SANDBOX_PAYMENT_GATEWAY=1 when MOS_ENV=production (ADR-123). Set a real PSP when ADR-084 lands.",
    );
  }
}
