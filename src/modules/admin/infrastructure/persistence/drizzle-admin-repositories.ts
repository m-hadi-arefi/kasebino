/**
 * Drizzle admin repositories (ADR-093 / ADR-013).
 */

import { and, desc, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  adminActions,
  adminUsers,
} from "../../../../infrastructure/database/schema/admin.js";
import {
  assertMerchantId,
  notDeleted,
} from "../../../../infrastructure/persistence/helpers.js";
import type {
  AdminAction,
  AdminActionResult,
  AdminActionType,
} from "../../domain/admin-action.js";
import type {
  AdminUser,
  AdminUserStatus,
} from "../../domain/admin-user.js";
import type {
  AdminActionRepository,
  AdminUserRepository,
} from "../../domain/repositories.js";

type UserRow = typeof adminUsers.$inferSelect;
type ActionRow = typeof adminActions.$inferSelect;

function toUser(row: UserRow): AdminUser {
  return {
    id: row.id,
    login: row.login,
    displayName: row.displayName,
    status: row.status as AdminUserStatus,
    role: "platform_admin",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAction(row: ActionRow): AdminAction {
  return {
    id: row.id,
    adminUserId: row.adminUserId,
    action: row.action as AdminActionType,
    merchantId: row.merchantId,
    result: row.result as AdminActionResult,
    reason: row.reason,
    reasonFa: row.reasonFa,
    correlationId: row.correlationId,
    beforeStatus: row.beforeStatus,
    afterStatus: row.afterStatus,
    createdAt: row.createdAt,
  };
}

export class DrizzleAdminUserRepository implements AdminUserRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(user: AdminUser): Promise<void> {
    await this.db.insert(adminUsers).values({
      id: user.id,
      login: user.login,
      displayName: user.displayName,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: null,
    });
  }

  async findById(id: string): Promise<AdminUser | null> {
    const rows = await this.db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.id, id), notDeleted(adminUsers.deletedAt)))
      .limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findByLogin(login: string): Promise<AdminUser | null> {
    const rows = await this.db
      .select()
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.login, login.trim().toLowerCase()),
          notDeleted(adminUsers.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async update(user: AdminUser): Promise<void> {
    await this.db
      .update(adminUsers)
      .set({
        login: user.login,
        displayName: user.displayName,
        status: user.status,
        updatedAt: user.updatedAt,
      })
      .where(and(eq(adminUsers.id, user.id), notDeleted(adminUsers.deletedAt)));
  }
}

export class DrizzleAdminActionRepository implements AdminActionRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(action: AdminAction): Promise<void> {
    await this.db.insert(adminActions).values({
      id: action.id,
      adminUserId: action.adminUserId,
      action: action.action,
      merchantId: action.merchantId,
      result: action.result,
      reason: action.reason,
      reasonFa: action.reasonFa,
      correlationId: action.correlationId,
      beforeStatus: action.beforeStatus,
      afterStatus: action.afterStatus,
      createdAt: action.createdAt,
    });
  }

  async findById(id: string): Promise<AdminAction | null> {
    const rows = await this.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.id, id))
      .limit(1);
    return rows[0] ? toAction(rows[0]) : null;
  }

  async listByMerchant(
    merchantId: string,
    opts: { limit?: number } = {},
  ): Promise<AdminAction[]> {
    assertMerchantId(merchantId);
    const limit = opts.limit ?? 100;
    const rows = await this.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.merchantId, merchantId))
      .orderBy(desc(adminActions.createdAt))
      .limit(limit);
    return rows.map(toAction);
  }

  async listByAdmin(
    adminUserId: string,
    opts: { limit?: number } = {},
  ): Promise<AdminAction[]> {
    const limit = opts.limit ?? 100;
    const rows = await this.db
      .select()
      .from(adminActions)
      .where(eq(adminActions.adminUserId, adminUserId))
      .orderBy(desc(adminActions.createdAt))
      .limit(limit);
    return rows.map(toAction);
  }

  async listRecent(opts: { limit?: number } = {}): Promise<AdminAction[]> {
    const limit = opts.limit ?? 100;
    const rows = await this.db
      .select()
      .from(adminActions)
      .orderBy(desc(adminActions.createdAt))
      .limit(limit);
    return rows.map(toAction);
  }
}
