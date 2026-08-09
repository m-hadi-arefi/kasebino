/**
 * Drizzle transaction scope (ADR-126 CompleteSale UoW).
 * Repositories share `executor` so a single db.transaction wraps the sale path.
 */

import type { DrizzleDb } from "../database/drizzle/client.js";

export class DrizzleTransactionScope {
  private active: DrizzleDb | null = null;

  constructor(private readonly root: DrizzleDb) {}

  get executor(): DrizzleDb {
    return this.active ?? this.root;
  }

  get isActive(): boolean {
    return this.active !== null;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active) {
      return fn();
    }
    return this.root.transaction(async (tx) => {
      this.active = tx as unknown as DrizzleDb;
      try {
        return await fn();
      } finally {
        this.active = null;
      }
    });
  }
}
