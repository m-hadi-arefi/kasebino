import { randomUUID } from "node:crypto";

import {
  buildDisplayAddress,
  isValidLatitude,
  isValidLongitude,
  type StoreAddress,
  type StoreAddressInput,
} from "../domain/address.js";
import type { StoreBranding } from "../domain/branding.js";
import {
  WEEKDAY_KEYS,
  defaultIranRetailHours,
  isValidHourTime,
  type StoreHours,
} from "../domain/hours.js";
import {
  applyStoreBranding,
  applyStoreHours,
  createStoreAggregate,
  type Store,
} from "../domain/store.js";
import {
  storeCreatedEvent,
  storeUpdatedEvent,
} from "../domain/events.js";
import type { StoreRepository } from "../domain/repositories.js";
import { StoreDomainError } from "./errors.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DISPLAY_NAME_MAX = 120;
const SLUG_MAX = 64;
const ADDRESS_LINE_MAX = 200;
const CITY_MAX = 80;
const HEX_COLOR = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export type StoreUseCaseDeps = {
  stores: StoreRepository;
  now?: () => Date;
  idFactory?: () => string;
};

export type CreateStoreInput = {
  merchantId: string;
  slug: string;
  displayName: string;
  address: StoreAddressInput;
  hours?: StoreHours;
  logoObjectKey?: string | null;
  primaryColor?: string | null;
};

export type CreateStoreResult = {
  store: Store;
  event: ReturnType<typeof storeCreatedEvent>;
};

export type UpdateStoreBrandingInput = {
  storeId: string;
  displayName?: string;
  logoObjectKey?: string | null;
  primaryColor?: string | null;
};

export type UpdateStoreBrandingResult = {
  store: Store;
  event: ReturnType<typeof storeUpdatedEvent>;
};

export type UpdateStoreHoursInput = {
  storeId: string;
  hours: StoreHours;
};

export type UpdateStoreHoursResult = {
  store: Store;
  event: ReturnType<typeof storeUpdatedEvent>;
};

function requireDisplayName(raw: string): string {
  const displayName = raw.trim();
  if (!displayName || displayName.length > DISPLAY_NAME_MAX) {
    throw new StoreDomainError("INVALID_DISPLAY_NAME");
  }
  return displayName;
}

function requireSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (!slug || slug.length > SLUG_MAX || !SLUG_PATTERN.test(slug)) {
    throw new StoreDomainError("INVALID_SLUG");
  }
  return slug;
}

function optionalPrimaryColor(
  raw: string | null | undefined,
): string | null {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return null;
  }
  const color = raw.trim();
  if (!HEX_COLOR.test(color)) {
    throw new StoreDomainError("INVALID_PRIMARY_COLOR");
  }
  return color.toLowerCase();
}

function requireAddress(input: StoreAddressInput): StoreAddress {
  const line1 = input.line1.trim();
  const city = input.city.trim();
  const province = input.province.trim();
  const line2 =
    input.line2 === undefined || input.line2 === null || input.line2.trim() === ""
      ? null
      : input.line2.trim();
  const postalCode =
    input.postalCode === undefined ||
    input.postalCode === null ||
    input.postalCode.trim() === ""
      ? null
      : input.postalCode.trim();

  if (
    !line1 ||
    line1.length > ADDRESS_LINE_MAX ||
    !city ||
    city.length > CITY_MAX ||
    !province ||
    province.length > CITY_MAX
  ) {
    throw new StoreDomainError("INVALID_ADDRESS");
  }

  if (
    !isValidLatitude(input.latitude) ||
    !isValidLongitude(input.longitude)
  ) {
    throw new StoreDomainError("INVALID_GEO");
  }

  const displayAddress =
    input.displayAddress !== undefined &&
    input.displayAddress !== null &&
    input.displayAddress.trim() !== ""
      ? input.displayAddress.trim()
      : buildDisplayAddress({
          line1,
          line2,
          city,
          province,
          postalCode,
        });

  return {
    line1,
    line2,
    city,
    province,
    postalCode,
    displayAddress,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

function requireHours(hours: StoreHours): StoreHours {
  for (const day of WEEKDAY_KEYS) {
    const slot = hours[day];
    if (slot === null) continue;
    if (!isValidHourTime(slot.open) || !isValidHourTime(slot.close)) {
      throw new StoreDomainError("INVALID_HOURS");
    }
  }
  return {
    saturday: hours.saturday,
    sunday: hours.sunday,
    monday: hours.monday,
    tuesday: hours.tuesday,
    wednesday: hours.wednesday,
    thursday: hours.thursday,
    friday: hours.friday,
  };
}

export function createStoreUseCases(deps: StoreUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  async function createStore(
    input: CreateStoreInput,
  ): Promise<CreateStoreResult> {
    const merchantId = input.merchantId.trim();

    const slug = requireSlug(input.slug);
    const existing = await deps.stores.findBySlug(slug);
    if (existing) {
      throw new StoreDomainError("SLUG_TAKEN");
    }

    const displayName = requireDisplayName(input.displayName);
    const address = requireAddress(input.address);
    const hours = requireHours(input.hours ?? defaultIranRetailHours());
    const branding: StoreBranding = {
      displayName,
      logoObjectKey: input.logoObjectKey ?? null,
      primaryColor: optionalPrimaryColor(input.primaryColor),
    };

    const at = now();
    const store = createStoreAggregate({
      id: idFactory(),
      merchantId,
      slug,
      branding,
      hours,
      address,
      status: "active",
      now: at,
    });

    await deps.stores.save(store);

    const event = storeCreatedEvent({
      storeId: store.id,
      merchantId: store.merchantId,
      slug: store.slug,
      displayName: store.branding.displayName,
      latitude: store.address.latitude,
      longitude: store.address.longitude,
      occurredAt: at,
    });

    return { store, event };
  }

  async function updateBranding(
    input: UpdateStoreBrandingInput,
  ): Promise<UpdateStoreBrandingResult> {
    const store = await deps.stores.findById(input.storeId);
    if (!store) {
      throw new StoreDomainError("STORE_NOT_FOUND");
    }

    const patch: Partial<StoreBranding> = {};
    if (input.displayName !== undefined) {
      patch.displayName = requireDisplayName(input.displayName);
    }
    if (input.logoObjectKey !== undefined) {
      patch.logoObjectKey = input.logoObjectKey;
    }
    if (input.primaryColor !== undefined) {
      patch.primaryColor = optionalPrimaryColor(input.primaryColor);
    }

    const at = now();
    const changedFields = applyStoreBranding(store, patch, at);
    if (changedFields.length === 0) {
      throw new StoreDomainError("NO_CHANGES");
    }

    await deps.stores.update(store);

    const event = storeUpdatedEvent({
      storeId: store.id,
      merchantId: store.merchantId,
      changedFields,
      occurredAt: at,
    });

    return { store, event };
  }

  async function updateHours(
    input: UpdateStoreHoursInput,
  ): Promise<UpdateStoreHoursResult> {
    const store = await deps.stores.findById(input.storeId);
    if (!store) {
      throw new StoreDomainError("STORE_NOT_FOUND");
    }

    const hours = requireHours(input.hours);
    const at = now();
    const changedFields = applyStoreHours(store, hours, at);
    if (changedFields.length === 0) {
      throw new StoreDomainError("NO_CHANGES");
    }

    await deps.stores.update(store);

    const event = storeUpdatedEvent({
      storeId: store.id,
      merchantId: store.merchantId,
      changedFields,
      occurredAt: at,
    });

    return { store, event };
  }

  return { createStore, updateBranding, updateHours };
}

export type StoreUseCases = ReturnType<typeof createStoreUseCases>;
