/**
 * In-memory repositories for unit tests / local wiring until Drizzle (ARD-002).
 */

import type { AuthUser } from "../../domain/auth-user.js";
import {
  isOtpChallengeConsumed,
  type OtpChallenge,
} from "../../domain/otp-challenge.js";
import type {
  AuthUserRepository,
  OtpChallengeRepository,
} from "../../domain/repositories.js";

export class InMemoryOtpChallengeRepository implements OtpChallengeRepository {
  private readonly rows: OtpChallenge[] = [];

  async save(challenge: OtpChallenge): Promise<void> {
    this.rows.push(challenge);
  }

  async findLatestUnconsumedByPhoneE164(
    phoneE164: string,
  ): Promise<OtpChallenge | null> {
    const candidates = this.rows
      .filter((c) => c.phoneE164 === phoneE164)
      .filter((c) => !isOtpChallengeConsumed(c))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return candidates[0] ?? null;
  }

  async update(challenge: OtpChallenge): Promise<void> {
    const idx = this.rows.findIndex((c) => c.id === challenge.id);
    if (idx >= 0) {
      this.rows[idx] = challenge;
    }
  }
}

export class InMemoryAuthUserRepository implements AuthUserRepository {
  private readonly byPhone = new Map<string, AuthUser>();

  async findByPhoneE164(phoneE164: string): Promise<AuthUser | null> {
    return this.byPhone.get(phoneE164) ?? null;
  }

  async save(user: AuthUser): Promise<void> {
    this.byPhone.set(user.phoneE164, user);
  }
}
