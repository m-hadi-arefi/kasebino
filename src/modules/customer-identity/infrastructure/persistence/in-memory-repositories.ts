/**
 * In-memory repositories for unit tests / local wiring until Drizzle (ARD-030).
 */

import type { CustomerIdentity } from "../../domain/customer-identity.js";
import {
  isCustomerOtpChallengeConsumed,
  type CustomerOtpChallenge,
} from "../../domain/otp-challenge.js";
import type {
  CustomerIdentityRepository,
  CustomerOtpChallengeRepository,
} from "../../domain/repositories.js";

export class InMemoryCustomerOtpChallengeRepository
  implements CustomerOtpChallengeRepository
{
  private readonly rows: CustomerOtpChallenge[] = [];

  async save(challenge: CustomerOtpChallenge): Promise<void> {
    this.rows.push(challenge);
  }

  async findLatestUnconsumedByPhoneE164(
    phoneE164: string,
  ): Promise<CustomerOtpChallenge | null> {
    const candidates = this.rows
      .filter((c) => c.phoneE164 === phoneE164)
      .filter((c) => !isCustomerOtpChallengeConsumed(c))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return candidates[0] ?? null;
  }

  async update(challenge: CustomerOtpChallenge): Promise<void> {
    const idx = this.rows.findIndex((c) => c.id === challenge.id);
    if (idx >= 0) {
      this.rows[idx] = challenge;
    }
  }
}

export class InMemoryCustomerIdentityRepository
  implements CustomerIdentityRepository
{
  private readonly byPhone = new Map<string, CustomerIdentity>();
  private readonly byId = new Map<string, CustomerIdentity>();

  async findById(id: string): Promise<CustomerIdentity | null> {
    return this.byId.get(id) ?? null;
  }

  async findByPhoneE164(
    phoneE164: string,
  ): Promise<CustomerIdentity | null> {
    return this.byPhone.get(phoneE164) ?? null;
  }

  async save(identity: CustomerIdentity): Promise<void> {
    this.byPhone.set(identity.phoneE164, identity);
    this.byId.set(identity.id, identity);
  }
}
