/**
 * OtpChallenge aggregate (merchant identity) — ADR-031 / ARD-002.
 * Stores hashed OTP only; plaintext never at rest.
 */

import { MERCHANT_OTP_POLICY } from "./merchant-auth/index.js";
import type { IranianMobile } from "./iranian-phone.js";

export type OtpChallenge = {
  readonly id: string;
  readonly phoneE164: string;
  readonly phoneNational: string;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly maxAttempts: number;
  attempts: number;
  consumedAt: Date | null;
  readonly createdAt: Date;
};

export type CreateOtpChallengeInput = {
  id: string;
  phone: IranianMobile;
  codeHash: string;
  now?: Date;
  ttlSeconds?: number;
  maxAttempts?: number;
};

export function createOtpChallenge(input: CreateOtpChallengeInput): OtpChallenge {
  const now = input.now ?? new Date();
  const ttlSeconds = input.ttlSeconds ?? MERCHANT_OTP_POLICY.ttlSeconds;
  const maxAttempts = input.maxAttempts ?? MERCHANT_OTP_POLICY.maxAttempts;
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
  };
}

export function isOtpChallengeExpired(
  challenge: OtpChallenge,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= challenge.expiresAt.getTime();
}

export function isOtpChallengeConsumed(challenge: OtpChallenge): boolean {
  return challenge.consumedAt !== null;
}

export function hasOtpAttemptsRemaining(challenge: OtpChallenge): boolean {
  return challenge.attempts < challenge.maxAttempts;
}

export function recordOtpAttempt(challenge: OtpChallenge): void {
  challenge.attempts += 1;
}

export function consumeOtpChallenge(
  challenge: OtpChallenge,
  now: Date = new Date(),
): void {
  challenge.consumedAt = now;
}
