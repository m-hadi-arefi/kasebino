/**
 * Store aggregate root (ADR-006).
 * One storefront surface per store; slug globally unique → `/s/{slug}`.
 */

import type { StoreAddress } from "./address.js";
import type { StoreBranding } from "./branding.js";
import type { StoreHours } from "./hours.js";
import type { StoreStatus } from "./store-status.js";

export type { StoreStatus };

export type Store = {
  readonly id: string;
  readonly merchantId: string;
  /** Globally unique URL-safe slug for `/s/{slug}`. */
  slug: string;
  branding: StoreBranding;
  hours: StoreHours;
  address: StoreAddress;
  status: StoreStatus;
  /** QR asset reference — generation → ARD-033. */
  qrAssetRef: string | null;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreateStoreAggregateInput = {
  id: string;
  merchantId: string;
  slug: string;
  branding: StoreBranding;
  hours: StoreHours;
  address: StoreAddress;
  status?: StoreStatus;
  qrAssetRef?: string | null;
  now?: Date;
};

export function createStoreAggregate(input: CreateStoreAggregateInput): Store {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    slug: input.slug,
    branding: { ...input.branding },
    hours: { ...input.hours },
    address: { ...input.address },
    status: input.status ?? "active",
    qrAssetRef: input.qrAssetRef ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyStoreBranding(
  store: Store,
  branding: Partial<StoreBranding>,
  at: Date = new Date(),
): string[] {
  const changed: string[] = [];
  if (
    branding.displayName !== undefined &&
    branding.displayName !== store.branding.displayName
  ) {
    store.branding = { ...store.branding, displayName: branding.displayName };
    changed.push("branding.displayName");
  }
  if (
    branding.logoObjectKey !== undefined &&
    branding.logoObjectKey !== store.branding.logoObjectKey
  ) {
    store.branding = {
      ...store.branding,
      logoObjectKey: branding.logoObjectKey,
    };
    changed.push("branding.logoObjectKey");
  }
  if (
    branding.primaryColor !== undefined &&
    branding.primaryColor !== store.branding.primaryColor
  ) {
    store.branding = {
      ...store.branding,
      primaryColor: branding.primaryColor,
    };
    changed.push("branding.primaryColor");
  }
  if (changed.length > 0) {
    store.updatedAt = at;
  }
  return changed;
}

export function applyStoreHours(
  store: Store,
  hours: StoreHours,
  at: Date = new Date(),
): string[] {
  const prev = JSON.stringify(store.hours);
  const next = JSON.stringify(hours);
  if (prev === next) {
    return [];
  }
  store.hours = { ...hours };
  store.updatedAt = at;
  return ["hours"];
}

export function applyStoreAddress(
  store: Store,
  address: StoreAddress,
  at: Date = new Date(),
): string[] {
  const prev = JSON.stringify(store.address);
  const next = JSON.stringify(address);
  if (prev === next) {
    return [];
  }
  store.address = { ...address };
  store.updatedAt = at;
  return ["address", "address.latitude", "address.longitude"];
}

export function applyStoreStatus(
  store: Store,
  status: StoreStatus,
  at: Date = new Date(),
): string[] {
  if (store.status === status) {
    return [];
  }
  store.status = status;
  store.updatedAt = at;
  return ["status"];
}
