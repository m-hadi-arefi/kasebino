/**
 * OtpChallenge aggregate (customer audience) — ADR-032 / ARD-030.
 * Stores hashed OTP only; plaintext never at rest.
 * Isolated from merchant OTP challenge store.
 */

import { CUSTOMER_OTP_POLICY } from "../../../customer-auth/index.js";
import type { IranianMobile } from "./iranian-phone.js";

export type CustomerOtpChallenge = {
  readonly id: string;
  readonly phoneE164: string;
  readonly phoneNational: string;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly maxAttempts: number;
  attempts: number;
  consumedAt: Date | null;
  readonly createdAt: Date;
  /** Audience tag — never merchant. */
  readonly audience: "customer";
};

export type CreateCustomerOtpChallengeInput = {
  id: string;
  phone: IranianMobile;
  codeHash: string;
  now?: Date;
  ttlSeconds?: number;
  maxAttempts?: number;
};

export function createCustomerOtpChallenge(
  input: CreateCustomerOtpChallengeInput,
): CustomerOtpChallenge {
  const now = input.now ?? new Date();
  const ttlSeconds = input.ttlSeconds ?? CUSTOMER_OTP_POLICY.ttlSeconds;
  const maxAttempts = input.maxAttempts ?? CUSTOMER_OTP_POLICY.maxAttempts;
  return {
    id: input.id,
    phoneE164: input.phone.e164,
    phoneNational: input.phone.national,
    codeHash: input.codeHash,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    maxAttempts,
    attempts: 0,
    consumedAt: null,
    createdAt: now,
    audience: "customer",
  };
}

export function isCustomerOtpChallengeExpired(
  challenge: CustomerOtpChallenge,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= challenge.expiresAt.getTime();
}

export function isCustomerOtpChallengeConsumed(
  challenge: CustomerOtpChallenge,
): boolean {
  return challenge.consumedAt !== null;
}

export function hasCustomerOtpAttemptsRemaining(
  challenge: CustomerOtpChallenge,
): boolean {
  return challenge.attempts < challenge.maxAttempts;
}

export function recordCustomerOtpAttempt(
  challenge: CustomerOtpChallenge,
): void {
  challenge.attempts += 1;
}

export function consumeCustomerOtpChallenge(
  challenge: CustomerOtpChallenge,
  now: Date = new Date(),
): void {
  challenge.consumedAt = now;
}
