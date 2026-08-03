/**
 * In-memory PointRuleRepository for unit tests / local wiring until Drizzle.
 */

import type { PointRule } from "../../domain/point-rule.js";
import type { PointRuleRepository } from "../../domain/repositories.js";

export class InMemoryPointRuleRepository implements PointRuleRepository {
  private readonly byId = new Map<string, PointRule>();

  private storeKey(merchantId: string, storeId: string): string {
    return `${merchantId}::${storeId}`;
  }

  async save(rule: PointRule): Promise<void> {
    this.byId.set(rule.id, rule);
  }

  async update(rule: PointRule): Promise<void> {
    this.byId.set(rule.id, rule);
  }

  async findById(id: string): Promise<PointRule | null> {
    return this.byId.get(id) ?? null;
  }

  async findByStoreId(
    merchantId: string,
    storeId: string,
  ): Promise<PointRule | null> {
    const key = this.storeKey(merchantId, storeId);
    for (const rule of this.byId.values()) {
      if (this.storeKey(rule.merchantId, rule.storeId) === key) {
        return rule;
      }
    }
    return null;
  }
}
