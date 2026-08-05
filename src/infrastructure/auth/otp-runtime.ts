/**
 * ADR-095 — OTP use-case composition for Auth.js + HTTP routes.
 * Keeps Next.js imports out of domain modules.
 */

import { createCustomerOtpUseCases } from "../../modules/customer-identity/application/customer-otp-use-cases.js";
import {
  InMemoryCustomerIdentityRepository,
  InMemoryCustomerOtpChallengeRepository,
} from "../../modules/customer-identity/infrastructure/persistence/in-memory-repositories.js";
import { createMerchantOtpUseCases } from "../../modules/identity/application/merchant-otp-use-cases.js";
import {
  InMemoryAuthUserRepository,
  InMemoryOtpChallengeRepository,
} from "../../modules/identity/infrastructure/persistence/in-memory-repositories.js";
import {
  getSharedProductionRepositories,
  resetSharedProductionRepositoriesForTests,
} from "../composition/shared-production-repositories.js";
import {
  assertProductionSmsPolicy,
} from "../composition/production-guards.js";
import {
  createCustomerSmsAdapter,
  createMerchantSmsAdapter,
  resolveSmsRuntimeEnv,
  type SmsRuntimeEnv,
} from "./sms-adapter-factory.js";

export type OtpRuntime = {
  merchant: ReturnType<typeof createMerchantOtpUseCases>;
  customer: ReturnType<typeof createCustomerOtpUseCases>;
};

export type CreateOtpRuntimeOptions = {
  env?: Record<string, string | undefined>;
  smsEnv?: SmsRuntimeEnv;
  /** Force in-memory repos (unit tests). */
  forceInMemory?: boolean;
};

function createInMemoryRuntime(
  nodeEnv: string,
  smsEnv: SmsRuntimeEnv,
): OtpRuntime {
  return {
    merchant: createMerchantOtpUseCases({
      otpChallenges: new InMemoryOtpChallengeRepository(),
      authUsers: new InMemoryAuthUserRepository(),
      sms: createMerchantSmsAdapter(smsEnv),
      nodeEnv,
    }),
    customer: createCustomerOtpUseCases({
      otpChallenges: new InMemoryCustomerOtpChallengeRepository(),
      identities: new InMemoryCustomerIdentityRepository(),
      sms: createCustomerSmsAdapter(smsEnv),
      nodeEnv,
    }),
  };
}

export function createOtpRuntime(
  options: CreateOtpRuntimeOptions = {},
): OtpRuntime {
  const env = options.env ?? process.env;
  const nodeEnv = env.NODE_ENV ?? "development";
  const smsEnv = resolveSmsRuntimeEnv(options.smsEnv ?? {}, env as NodeJS.ProcessEnv);

  if (options.forceInMemory) {
    return createInMemoryRuntime(nodeEnv, smsEnv);
  }

  if (env.DATABASE_URL?.trim()) {
    assertProductionSmsPolicy(env as NodeJS.ProcessEnv);
    const repos = getSharedProductionRepositories(env as NodeJS.ProcessEnv);
    return {
      merchant: createMerchantOtpUseCases({
        otpChallenges: repos.otpChallenges,
        authUsers: repos.authUsers,
        sms: createMerchantSmsAdapter(smsEnv),
        nodeEnv,
      }),
      customer: createCustomerOtpUseCases({
        otpChallenges: repos.customerOtpChallenges,
        identities: repos.customerIdentities,
        sms: createCustomerSmsAdapter(smsEnv),
        nodeEnv,
      }),
    };
  }

  if (
    smsEnv.mosEnv.toLowerCase() === "local" ||
    nodeEnv === "development"
  ) {
    return createInMemoryRuntime(nodeEnv, smsEnv);
  }

  throw new Error(
    "DATABASE_URL is required for OTP runtime outside local/development (ADR-095).",
  );
}

let singleton: OtpRuntime | undefined;

/** Process-scoped OTP runtime (App Router handlers / auth.ts). */
export function getOtpRuntime(): OtpRuntime {
  if (!singleton) {
    singleton = createOtpRuntime();
  }
  return singleton;
}

/** Test helper — reset composition root. */
export function resetOtpRuntimeForTests(): void {
  singleton = undefined;
  resetSharedProductionRepositoriesForTests();
}

export function setOtpRuntimeForTests(runtime: OtpRuntime): void {
  singleton = runtime;
}
