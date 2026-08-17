import { createHash, randomInt, randomUUID } from "node:crypto";

import {
  CUSTOMER_OTP_POLICY,
  shouldReturnDevOtp,
} from "../domain/auth/index.js";
import { createCustomerIdentity } from "../domain/customer-identity.js";
import { customerLoggedInEvent } from "../domain/events.js";
import { normalizeIranianMobile } from "../domain/iranian-phone.js";
import {
  consumeCustomerOtpChallenge,
  createCustomerOtpChallenge,
  hasCustomerOtpAttemptsRemaining,
  isCustomerOtpChallengeConsumed,
  isCustomerOtpChallengeExpired,
  recordCustomerOtpAttempt,
} from "../domain/otp-challenge.js";
import type {
  CustomerIdentityRepository,
  CustomerOtpChallengeRepository,
} from "../domain/repositories.js";
import {
  CUSTOMER_OTP_SMS_TEMPLATE_FA,
  CustomerAuthError,
} from "./errors.js";
import type { SmsPort } from "./ports/sms-port.js";

export type CustomerOtpUseCaseDeps = {
  otpChallenges: CustomerOtpChallengeRepository;
  identities: CustomerIdentityRepository;
  sms: SmsPort;
  /** Inject for tests — defaults to process.env.NODE_ENV. */
  nodeEnv?: string;
  now?: () => Date;
  idFactory?: () => string;
  otpCodeFactory?: () => string;
};

export type RequestCustomerOtpInput = {
  phone: string;
  /**
   * Explicit digital consent checkbox (ADR-091) — required before OTP send.
   * POS notice-continue must NOT be used here.
   */
  consentCheckboxAccepted: boolean;
};

export type RequestCustomerOtpResult = {
  phoneNational: string;
  phoneE164: string;
  expiresAt: Date;
  /** Present only outside production (AUTH-03). */
  devOtp?: string;
};

export type VerifyCustomerOtpInput = {
  phone: string;
  code: string;
  /** Explicit consent required again at verify (ADR-091 send/verify). */
  consentCheckboxAccepted: boolean;
  /** Optional store scope for membership join / analytics later. */
  storeId?: string | null;
};

export type VerifyCustomerOtpResult = {
  customerIdentityId: string;
  phoneE164: string;
  phoneNational: string;
  role: "customer";
  tokenVersion: number;
  /** Domain event for outbox / analytics later. */
  event: ReturnType<typeof customerLoggedInEvent>;
};

function hashOtpCode(phoneE164: string, code: string): string {
  return createHash("sha256")
    .update(`customer:${phoneE164}:${code}`)
    .digest("hex");
}

function generateOtpCode(): string {
  const max = 10 ** CUSTOMER_OTP_POLICY.codeLength;
  const n = randomInt(0, max);
  return n.toString().padStart(CUSTOMER_OTP_POLICY.codeLength, "0");
}

function requireIranianPhone(raw: string) {
  const result = normalizeIranianMobile(raw);
  if (!result.ok) {
    throw new CustomerAuthError("INVALID_PHONE");
  }
  return result.phone;
}

function requireConsent(accepted: boolean): void {
  if (!accepted) {
    throw new CustomerAuthError("CONSENT_REQUIRED");
  }
}

export function createCustomerOtpUseCases(deps: CustomerOtpUseCaseDeps) {
  const nodeEnv = deps.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());
  const otpCodeFactory = deps.otpCodeFactory ?? generateOtpCode;

  async function requestOtp(
    input: RequestCustomerOtpInput,
  ): Promise<RequestCustomerOtpResult> {
    requireConsent(input.consentCheckboxAccepted);
    const phone = requireIranianPhone(input.phone);
    const code = otpCodeFactory();
    const codeHash = hashOtpCode(phone.e164, code);
    const challenge = createCustomerOtpChallenge({
      id: idFactory(),
      phone,
      codeHash,
      now: now(),
    });
    await deps.otpChallenges.save(challenge);

    // Always via SmsPort — compose Console/Mock until ADR-083 selects a provider.
    const bodyFa = CUSTOMER_OTP_SMS_TEMPLATE_FA.replace("{code}", code);
    await deps.sms.send({ toE164: phone.e164, bodyFa });

    if (shouldReturnDevOtp(nodeEnv)) {
      return {
        phoneNational: phone.national,
        phoneE164: phone.e164,
        expiresAt: challenge.expiresAt,
        devOtp: code,
      };
    }

    return {
      phoneNational: phone.national,
      phoneE164: phone.e164,
      expiresAt: challenge.expiresAt,
    };
  }

  async function verifyOtp(
    input: VerifyCustomerOtpInput,
  ): Promise<VerifyCustomerOtpResult> {
    requireConsent(input.consentCheckboxAccepted);
    const phone = requireIranianPhone(input.phone);
    const code = input.code.trim();
    if (!/^\d{6}$/.test(code)) {
      throw new CustomerAuthError("OTP_INVALID");
    }

    const at = now();
    const challenge = await deps.otpChallenges.findLatestUnconsumedByPhoneE164(
      phone.e164,
    );
    if (!challenge || isCustomerOtpChallengeConsumed(challenge)) {
      throw new CustomerAuthError("OTP_NOT_FOUND");
    }
    if (isCustomerOtpChallengeExpired(challenge, at)) {
      throw new CustomerAuthError("OTP_EXPIRED");
    }
    if (!hasCustomerOtpAttemptsRemaining(challenge)) {
      throw new CustomerAuthError("OTP_MAX_ATTEMPTS");
    }

    const expectedHash = hashOtpCode(phone.e164, code);
    if (expectedHash !== challenge.codeHash) {
      recordCustomerOtpAttempt(challenge);
      await deps.otpChallenges.update(challenge);
      if (!hasCustomerOtpAttemptsRemaining(challenge)) {
        throw new CustomerAuthError("OTP_MAX_ATTEMPTS");
      }
      throw new CustomerAuthError("OTP_INVALID");
    }

    consumeCustomerOtpChallenge(challenge, at);
    await deps.otpChallenges.update(challenge);

    let identity = await deps.identities.findByPhoneE164(phone.e164);
    if (!identity) {
      identity = createCustomerIdentity({
        id: idFactory(),
        phoneE164: phone.e164,
        phoneNational: phone.national,
        now: at,
      });
      await deps.identities.save(identity);
    }

    const event = customerLoggedInEvent({
      customerIdentityId: identity.id,
      phoneE164: phone.e164,
      storeId: input.storeId ?? null,
      occurredAt: at,
    });

    return {
      customerIdentityId: identity.id,
      phoneE164: phone.e164,
      phoneNational: phone.national,
      role: "customer",
      tokenVersion: identity.tokenVersion,
      event,
    };
  }

  return { requestOtp, verifyOtp };
}

export type CustomerOtpUseCases = ReturnType<typeof createCustomerOtpUseCases>;
