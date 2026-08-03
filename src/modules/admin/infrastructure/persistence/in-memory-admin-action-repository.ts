/**
 * In-memory AdminActionRepository (ADR-013) until Drizzle.
 */

import type { AdminAction } from "../../domain/admin-action.js";
import type { AdminActionRepository } from "../../domain/repositories.js";

export class InMemoryAdminActionRepository implements AdminActionRepository {
  private readonly byId = new Map<string, AdminAction>();

  async save(action: AdminAction): Promise<void> {
    this.byId.set(action.id, action);
  }

  async findById(id: string): Promise<AdminAction | null> {
    return this.byId.get(id) ?? null;
  }

  async listByMerchant(
    merchantId: string,
    opts: { limit?: number } = {},
  ): Promise<AdminAction[]> {
    const limit = opts.limit ?? 100;
    return [...this.byId.values()]
      .filter((a) => a.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async listByAdmin(
    adminUserId: string,
    opts: { limit?: number } = {},
  ): Promise<AdminAction[]> {
    const limit = opts.limit ?? 100;
    return [...this.byId.values()]
      .filter((a) => a.adminUserId === adminUserId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
