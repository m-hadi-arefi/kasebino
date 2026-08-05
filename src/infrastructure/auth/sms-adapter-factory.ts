/**
 * ADR-095 — SMS adapter selection for identity runtimes.
 * Console SMS is local/development only (never default in staging/production).
 */

import { ConsoleSmsAdapter as CustomerConsoleSmsAdapter } from "../../modules/customer-identity/infrastructure/sms/console-sms-adapter.js";
import { MockSmsAdapter as CustomerMockSmsAdapter } from "../../modules/customer-identity/infrastructure/sms/mock-sms-adapter.js";
import type { SmsPort as CustomerSmsPort } from "../../modules/customer-identity/application/ports/sms-port.js";
import { ConsoleSmsAdapter as MerchantConsoleSmsAdapter } from "../../modules/identity/infrastructure/sms/console-sms-adapter.js";
import { MockSmsAdapter as MerchantMockSmsAdapter } from "../../modules/identity/infrastructure/sms/mock-sms-adapter.js";
import type { SmsPort as MerchantSmsPort } from "../../modules/identity/application/ports/sms-port.js";

export type SmsRuntimeEnv = {
  mosEnv?: string;
  nodeEnv?: string;
};

export function resolveSmsRuntimeEnv(
  env: SmsRuntimeEnv = {},
  processEnv: NodeJS.ProcessEnv = process.env,
): Required<SmsRuntimeEnv> {
  return {
    mosEnv: (env.mosEnv ?? processEnv.MOS_ENV ?? "").trim(),
    nodeEnv: (env.nodeEnv ?? processEnv.NODE_ENV ?? "development").trim(),
  };
}

/** Local Compose / NODE_ENV=development — console SMS observability allowed. */
export function isLocalSmsEnvironment(env: SmsRuntimeEnv): boolean {
  const resolved = resolveSmsRuntimeEnv(env);
  const mos = resolved.mosEnv.toLowerCase();
  const node = resolved.nodeEnv.toLowerCase();
  return mos === "local" || node === "development";
}

export function assertConsoleSmsAllowed(env: SmsRuntimeEnv): void {
  if (!isLocalSmsEnvironment(env)) {
    throw new Error(
      "Console SMS adapter is forbidden outside local/development (ADR-095 / ADR-083).",
    );
  }
}

export function createMerchantSmsAdapter(
  env: SmsRuntimeEnv = {},
): MerchantSmsPort {
  if (isLocalSmsEnvironment(env)) {
    return new MerchantConsoleSmsAdapter();
  }
  return new MerchantMockSmsAdapter();
}

export function createCustomerSmsAdapter(
  env: SmsRuntimeEnv = {},
): CustomerSmsPort {
  if (isLocalSmsEnvironment(env)) {
    return new CustomerConsoleSmsAdapter();
  }
  return new CustomerMockSmsAdapter();
}

export function isConsoleSmsAdapter(adapter: unknown): boolean {
  return (
    adapter instanceof MerchantConsoleSmsAdapter ||
    adapter instanceof CustomerConsoleSmsAdapter
  );
}
