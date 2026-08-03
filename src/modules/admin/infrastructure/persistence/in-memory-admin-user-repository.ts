/**
 * In-memory AdminUserRepository (ADR-013) until Drizzle.
 */

import type { AdminUser } from "../../domain/admin-user.js";
import type { AdminUserRepository } from "../../domain/repositories.js";

export class InMemoryAdminUserRepository implements AdminUserRepository {
  private readonly byId = new Map<string, AdminUser>();
  private readonly byLogin = new Map<string, string>();

  async save(user: AdminUser): Promise<void> {
    this.byId.set(user.id, user);
    this.byLogin.set(user.login, user.id);
  }

  async findById(id: string): Promise<AdminUser | null> {
    return this.byId.get(id) ?? null;
  }

  async findByLogin(login: string): Promise<AdminUser | null> {
    const id = this.byLogin.get(login.trim().toLowerCase());
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  async update(user: AdminUser): Promise<void> {
    const previous = this.byId.get(user.id);
    if (previous && previous.login !== user.login) {
      this.byLogin.delete(previous.login);
    }
    this.byId.set(user.id, user);
    this.byLogin.set(user.login, user.id);
  }
}
