/**
 * Drizzle MerchantRepository (ADR-093 / ADR-005).
 */

import { and, asc, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { merchants } from "../../../../infrastructure/database/schema/merchants.js";
import {
  notDeleted,
  parseJsonObject,
} from "../../../../infrastructure/persistence/helpers.js";
import {
  DEFAULT_MERCHANT_SETTINGS,
  type Merchant,
  type MerchantSettings,
} from "../../domain/merchant.js";
import type { MerchantStatus } from "../../domain/merchant-status.js";
import type {
  ListMerchantsInput,
  MerchantRepository,
} from "../../domain/repositories.js";

type MerchantRow = typeof merchants.$inferSelect;

function toMerchant(row: MerchantRow): Merchant {
  const settings = parseJsonObject<MerchantSettings>(
    row.settingsJson,
    DEFAULT_MERCHANT_SETTINGS,
  );
  return {
    id: row.id,
    tradeName: row.tradeName,
    slug: row.slug,
    status: row.status as MerchantStatus,
    ownerUserId: row.ownerUserId,
    contactPhoneNational: row.contactPhoneNational,
    contactPhoneE164: row.contactPhoneE164,
    multiStoreEnabled: true,
    settings: {
      ...DEFAULT_MERCHANT_SETTINGS,
      ...settings,
      localeDefault: "fa-IR",
      displayTimezone: "Asia/Tehran",
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    activatedAt: row.activatedAt,
  };
}

function toRow(merchant: Merchant) {
  return {
    id: merchant.id,
    tradeName: merchant.tradeName,
    slug: merchant.slug,
    status: merchant.status,
    ownerUserId: merchant.ownerUserId,
    contactPhoneNational: merchant.contactPhoneNational,
    contactPhoneE164: merchant.contactPhoneE164,
    multiStoreEnabled: true as const,
    settingsJson: JSON.stringify(merchant.settings),
    activatedAt: merchant.activatedAt,
    createdAt: merchant.createdAt,
    updatedAt: merchant.updatedAt,
    deletedAt: null as Date | null,
  };
}

export class DrizzleMerchantRepository implements MerchantRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(merchant: Merchant): Promise<void> {
    await this.db.insert(merchants).values(toRow(merchant));
  }

  async findById(id: string): Promise<Merchant | null> {
    const rows = await this.db
      .select()
      .from(merchants)
      .where(and(eq(merchants.id, id), notDeleted(merchants.deletedAt)))
      .limit(1);
    return rows[0] ? toMerchant(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Merchant | null> {
    const rows = await this.db
      .select()
      .from(merchants)
      .where(and(eq(merchants.slug, slug), notDeleted(merchants.deletedAt)))
      .limit(1);
    return rows[0] ? toMerchant(rows[0]) : null;
  }

  async findByOwnerUserId(ownerUserId: string): Promise<Merchant | null> {
    const rows = await this.db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.ownerUserId, ownerUserId.trim()),
          notDeleted(merchants.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toMerchant(rows[0]) : null;
  }

  async update(merchant: Merchant): Promise<void> {
    await this.db
      .update(merchants)
      .set({
        tradeName: merchant.tradeName,
        slug: merchant.slug,
        status: merchant.status,
        contactPhoneNational: merchant.contactPhoneNational,
        contactPhoneE164: merchant.contactPhoneE164,
        settingsJson: JSON.stringify(merchant.settings),
        activatedAt: merchant.activatedAt,
        updatedAt: merchant.updatedAt,
      })
      .where(and(eq(merchants.id, merchant.id), notDeleted(merchants.deletedAt)));
  }

  async list(input: ListMerchantsInput = {}): Promise<Merchant[]> {
    const limit = input.limit ?? 100;
    const offset = input.offset ?? 0;
    const conditions = [notDeleted(merchants.deletedAt)];
    if (input.status !== undefined) {
      conditions.push(eq(merchants.status, input.status));
    }
    const rows = await this.db
      .select()
      .from(merchants)
      .where(and(...conditions))
      .orderBy(asc(merchants.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(toMerchant);
  }
}
