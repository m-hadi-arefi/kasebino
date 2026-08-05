/**
 * Drizzle StoreRepository (ADR-093 / ADR-006).
 */

import { and, asc, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { stores } from "../../../../infrastructure/database/schema/stores.js";
import {
  assertMerchantId,
  notDeleted,
  parseJsonObject,
} from "../../../../infrastructure/persistence/helpers.js";
import type { StoreAddress } from "../../domain/address.js";
import type { StoreHours } from "../../domain/hours.js";
import type { StoreRepository } from "../../domain/repositories.js";
import type { Store } from "../../domain/store.js";
import type { StoreStatus } from "../../domain/store-status.js";
import { emptyStoreHours } from "../../domain/hours.js";

type StoreRow = typeof stores.$inferSelect;

function toStore(row: StoreRow): Store {
  return {
    id: row.id,
    merchantId: row.merchantId,
    slug: row.slug,
    branding: {
      displayName: row.displayName,
      logoObjectKey: row.logoObjectKey,
      primaryColor: row.primaryColor,
    },
    hours: parseJsonObject<StoreHours>(row.hoursJson, emptyStoreHours()),
    address: {
      line1: row.addressLine1,
      line2: row.addressLine2,
      city: row.city,
      province: row.province,
      postalCode: row.postalCode,
      displayAddress: row.displayAddress,
      latitude: row.latitude,
      longitude: row.longitude,
    } satisfies StoreAddress,
    status: row.status as StoreStatus,
    qrAssetRef: row.qrAssetRef,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRow(store: Store) {
  return {
    id: store.id,
    merchantId: store.merchantId,
    slug: store.slug,
    displayName: store.branding.displayName,
    logoObjectKey: store.branding.logoObjectKey,
    primaryColor: store.branding.primaryColor,
    status: store.status,
    addressLine1: store.address.line1,
    addressLine2: store.address.line2,
    city: store.address.city,
    province: store.address.province,
    postalCode: store.address.postalCode,
    displayAddress: store.address.displayAddress,
    latitude: store.address.latitude,
    longitude: store.address.longitude,
    hoursJson: JSON.stringify(store.hours),
    qrAssetRef: store.qrAssetRef,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    deletedAt: null as Date | null,
  };
}

export class DrizzleStoreRepository implements StoreRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(store: Store): Promise<void> {
    await this.db.insert(stores).values(toRow(store));
  }

  async findById(id: string): Promise<Store | null> {
    const rows = await this.db
      .select()
      .from(stores)
      .where(and(eq(stores.id, id), notDeleted(stores.deletedAt)))
      .limit(1);
    return rows[0] ? toStore(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Store | null> {
    const rows = await this.db
      .select()
      .from(stores)
      .where(and(eq(stores.slug, slug), notDeleted(stores.deletedAt)))
      .limit(1);
    return rows[0] ? toStore(rows[0]) : null;
  }

  async listByMerchantId(merchantId: string): Promise<Store[]> {
    assertMerchantId(merchantId);
    const rows = await this.db
      .select()
      .from(stores)
      .where(
        and(eq(stores.merchantId, merchantId), notDeleted(stores.deletedAt)),
      )
      .orderBy(asc(stores.createdAt));
    return rows.map(toStore);
  }

  async update(store: Store): Promise<void> {
    await this.db
      .update(stores)
      .set({
        slug: store.slug,
        displayName: store.branding.displayName,
        logoObjectKey: store.branding.logoObjectKey,
        primaryColor: store.branding.primaryColor,
        status: store.status,
        addressLine1: store.address.line1,
        addressLine2: store.address.line2,
        city: store.address.city,
        province: store.address.province,
        postalCode: store.address.postalCode,
        displayAddress: store.address.displayAddress,
        latitude: store.address.latitude,
        longitude: store.address.longitude,
        hoursJson: JSON.stringify(store.hours),
        qrAssetRef: store.qrAssetRef,
        updatedAt: store.updatedAt,
      })
      .where(and(eq(stores.id, store.id), notDeleted(stores.deletedAt)));
  }
}
