/**
 * In-memory StoreMembershipRepository for unit tests / local wiring until Drizzle.
 */

import type { StoreMembership } from "../../domain/store-membership.js";
import type { StoreMembershipRepository } from "../../domain/repositories.js";

export class InMemoryStoreMembershipRepository
  implements StoreMembershipRepository
{
  private readonly byId = new Map<string, StoreMembership>();

  private storePhoneKey(storeId: string, phoneNational: string): string {
    return `${storeId}::${phoneNational}`;
  }

  async save(membership: StoreMembership): Promise<void> {
    this.byId.set(membership.id, membership);
  }

  async update(membership: StoreMembership): Promise<void> {
    this.byId.set(membership.id, membership);
  }

  async findById(id: string): Promise<StoreMembership | null> {
    return this.byId.get(id) ?? null;
  }

  async findByStoreAndPhone(
    storeId: string,
    phoneNational: string,
  ): Promise<StoreMembership | null> {
    const key = this.storePhoneKey(storeId, phoneNational);
    for (const m of this.byId.values()) {
      if (m.deletedAt !== null) continue;
      if (this.storePhoneKey(m.storeId, m.phoneNational) === key) {
        return m;
      }
    }
    return null;
  }

  async listByStoreId(
    storeId: string,
    options?: { merchantId?: string; includeDeleted?: boolean },
  ): Promise<StoreMembership[]> {
    const includeDeleted = options?.includeDeleted ?? false;
    return [...this.byId.values()].filter((m) => {
      if (m.storeId !== storeId) return false;
      if (options?.merchantId !== undefined && m.merchantId !== options.merchantId) {
        return false;
      }
      if (!includeDeleted && m.deletedAt !== null) return false;
      return true;
    });
  }

  async listByMerchantId(
    merchantId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<StoreMembership[]> {
    const includeDeleted = options?.includeDeleted ?? false;
    return [...this.byId.values()].filter((m) => {
      if (m.merchantId !== merchantId) return false;
      if (!includeDeleted && m.deletedAt !== null) return false;
      return true;
    });
  }
}
