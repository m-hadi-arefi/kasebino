import { createHash, randomInt, randomUUID } from "node:crypto";

import {
  MERCHANT_OTP_POLICY,
  shouldReturnDevOtp,
} from "../domain/merchant-auth/index.js";
import { createAuthUser } from "../domain/auth-user.js";
import { merchantLoggedInEvent } from "../domain/events.js";
import { normalizeIranianMobile } from "../domain/iranian-phone.js";
import {
  consumeOtpChallenge,
  createOtpChallenge,
  hasOtpAttemptsRemaining,
  isOtpChallengeConsumed,
  isOtpChallengeExpired,
  recordOtpAttempt,
} from "../domain/otp-challenge.js";
import type {
  AuthUserRepository,
  OtpChallengeRepository,
} from "../domain/repositories.js";
import {
  MERCHANT_OTP_SMS_TEMPLATE_FA,
  MerchantAuthError,
} from "./errors.js";
import type { SmsPort } from "./ports/sms-port.js";

export type MerchantOtpUseCaseDeps = {
  otpChallenges: OtpChallengeRepository;
  authUsers: AuthUserRepository;
  sms: SmsPort;
  /** Inject for tests — defaults to process.env.NODE_ENV. */
  nodeEnv?: string;
  now?: () => Date;
  idFactory?: () => string;
  otpCodeFactory?: () => string;
};

export type RequestMerchantOtpInput = {
  phone: string;
};

export type RequestMerchantOtpResult = {
  phoneNational: string;
  phoneE164: string;
  expiresAt: Date;
  /** Present only outside production (AUTH-03). */
  devOtp?: string;
};

export type VerifyMerchantOtpInput = {
  phone: string;
  code: string;
};

export type VerifyMerchantOtpResult = {
  authUserId: string;
  phoneE164: string;
  phoneNational: string;
  tokenVersion: number;
  /** Domain event for outbox / analytics later. */
  event: ReturnType<typeof merchantLoggedInEvent>;
};

function hashOtpCode(phoneE164: string, code: string): string {
  return createHash("sha256")
    .update(`${phoneE164}:${code}`)
    .digest("hex");
}

function generateOtpCode(): string {
  const max = 10 ** MERCHANT_OTP_POLICY.codeLength;
  const n = randomInt(0, max);
  return n.toString().padStart(MERCHANT_OTP_POLICY.codeLength, "0");
}

function requireIranianPhone(raw: string) {
  const result = normalizeIranianMobile(raw);
  if (!result.ok) {
    throw new MerchantAuthError("INVALID_PHONE");
  }
  return result.phone;
}

export function createMerchantOtpUseCases(deps: MerchantOtpUseCaseDeps) {
  const nodeEnv = deps.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());
  const otpCodeFactory = deps.otpCodeFactory ?? generateOtpCode;

  async function requestOtp(
    input: RequestMerchantOtpInput,
  ): Promise<RequestMerchantOtpResult> {
    const phone = requireIranianPhone(input.phone);
    const code = otpCodeFactory();
    const codeHash = hashOtpCode(phone.e164, code);
    const challenge = createOtpChallenge({
      id: idFactory(),
      phone,
      codeHash,
      now: now(),
    });
    await deps.otpChallenges.save(challenge);

    // Always via SmsPort — compose Console/Mock until ADR-083 selects a provider.
    const bodyFa = MERCHANT_OTP_SMS_TEMPLATE_FA.replace("{code}", code);
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
    input: VerifyMerchantOtpInput,
  ): Promise<VerifyMerchantOtpResult> {
    const phone = requireIranianPhone(input.phone);
    const code = input.code.trim();
    if (!/^\d{6}$/.test(code)) {
      throw new MerchantAuthError("OTP_INVALID");
    }

    const at = now();
    const challenge = await deps.otpChallenges.findLatestUnconsumedByPhoneE164(
      phone.e164,
    );
    if (!challenge || isOtpChallengeConsumed(challenge)) {
      throw new MerchantAuthError("OTP_NOT_FOUND");
    }
    if (isOtpChallengeExpired(challenge, at)) {
      throw new MerchantAuthError("OTP_EXPIRED");
    }
    if (!hasOtpAttemptsRemaining(challenge)) {
      throw new MerchantAuthError("OTP_MAX_ATTEMPTS");
    }

    const expectedHash = hashOtpCode(phone.e164, code);
    if (expectedHash !== challenge.codeHash) {
      recordOtpAttempt(challenge);
      await deps.otpChallenges.update(challenge);
      if (!hasOtpAttemptsRemaining(challenge)) {
        throw new MerchantAuthError("OTP_MAX_ATTEMPTS");
      }
      throw new MerchantAuthError("OTP_INVALID");
    }

    consumeOtpChallenge(challenge, at);
    await deps.otpChallenges.update(challenge);

    let user = await deps.authUsers.findByPhoneE164(phone.e164);
    if (!user) {
      user = createAuthUser({
        id: idFactory(),
        phoneE164: phone.e164,
        phoneNational: phone.national,
        now: at,
      });
      await deps.authUsers.save(user);
    }

    const event = merchantLoggedInEvent({
      authUserId: user.id,
      phoneE164: phone.e164,
      occurredAt: at,
    });

    return {
      authUserId: user.id,
      phoneE164: phone.e164,
      phoneNational: phone.national,
      tokenVersion: user.tokenVersion,
      event,
    };
  }

  return { requestOtp, verifyOtp };
}

export type MerchantOtpUseCases = ReturnType<typeof createMerchantOtpUseCases>;
