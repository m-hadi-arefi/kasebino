import { randomUUID } from "node:crypto";

import { normalizeIranianMobile } from "../../../shared/domain/iranian-phone.js";
import {
  activateMerchantAggregate,
  applyMerchantProfile,
  createMerchantAggregate,
  type Merchant,
  type MerchantSettings,
} from "../domain/merchant.js";
import {
  merchantActivatedEvent,
  merchantCreatedEvent,
  merchantUpdatedEvent,
} from "../domain/events.js";
import type { MerchantRepository } from "../domain/repositories.js";
import {
  canActivateFrom,
  isSuspended,
} from "../domain/merchant-status.js";
import { MerchantDomainError } from "./errors.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TRADE_NAME_MAX = 120;
const SLUG_MAX = 64;

export type MerchantUseCaseDeps = {
  merchants: MerchantRepository;
  now?: () => Date;
  idFactory?: () => string;
};

export type CreateMerchantInput = {
  tradeName: string;
  slug: string;
  ownerUserId: string;
  contactPhone?: string | null;
};

export type CreateMerchantResult = {
  merchant: Merchant;
  event: ReturnType<typeof merchantCreatedEvent>;
};

export type ActivateMerchantInput = {
  merchantId: string;
};

export type ActivateMerchantResult = {
  merchant: Merchant;
  event: ReturnType<typeof merchantActivatedEvent>;
};

export type UpdateMerchantSettingsInput = {
  merchantId: string;
  tradeName?: string;
  slug?: string;
  contactPhone?: string | null;
  settings?: Partial<MerchantSettings>;
};

export type UpdateMerchantSettingsResult = {
  merchant: Merchant;
  event: ReturnType<typeof merchantUpdatedEvent>;
};

function requireTradeName(raw: string): string {
  const tradeName = raw.trim();
  if (!tradeName || tradeName.length > TRADE_NAME_MAX) {
    throw new MerchantDomainError("INVALID_TRADE_NAME");
  }
  return tradeName;
}

function requireSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (
    !slug ||
    slug.length > SLUG_MAX ||
    !SLUG_PATTERN.test(slug)
  ) {
    throw new MerchantDomainError("INVALID_SLUG");
  }
  return slug;
}

function optionalContactPhone(raw: string | null | undefined): {
  national: string | null;
  e164: string | null;
} {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return { national: null, e164: null };
  }
  const result = normalizeIranianMobile(raw);
  if (!result.ok) {
    throw new MerchantDomainError("INVALID_PHONE");
  }
  return { national: result.phone.national, e164: result.phone.e164 };
}

export function createMerchantUseCases(deps: MerchantUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  async function createMerchant(
    input: CreateMerchantInput,
  ): Promise<CreateMerchantResult> {
    const tradeName = requireTradeName(input.tradeName);
    const slug = requireSlug(input.slug);
    const ownerUserId = input.ownerUserId.trim();
    if (!ownerUserId) {
      throw new MerchantDomainError("MERCHANT_NOT_FOUND");
    }

    const owned = await deps.merchants.findByOwnerUserId(ownerUserId);
    if (owned) {
      throw new MerchantDomainError("OWNER_ALREADY_HAS_MERCHANT");
    }

    const existing = await deps.merchants.findBySlug(slug);
    if (existing) {
      throw new MerchantDomainError("SLUG_TAKEN");
    }

    const phone = optionalContactPhone(input.contactPhone);
    const at = now();
    const merchant = createMerchantAggregate({
      id: idFactory(),
      tradeName,
      slug,
      ownerUserId,
      contactPhoneNational: phone.national,
      contactPhoneE164: phone.e164,
      now: at,
    });

    await deps.merchants.save(merchant);

    const event = merchantCreatedEvent({
      merchantId: merchant.id,
      name: merchant.tradeName,
      slug: merchant.slug,
      ownerUserId: merchant.ownerUserId,
      occurredAt: at,
    });

    return { merchant, event };
  }

  async function activateMerchant(
    input: ActivateMerchantInput,
  ): Promise<ActivateMerchantResult> {
    const merchant = await deps.merchants.findById(input.merchantId);
    if (!merchant) {
      throw new MerchantDomainError("MERCHANT_NOT_FOUND");
    }
    if (merchant.status === "active") {
      throw new MerchantDomainError("ALREADY_ACTIVE");
    }
    if (isSuspended(merchant.status)) {
      throw new MerchantDomainError("SUSPENDED_CANNOT_ACTIVATE");
    }
    if (!canActivateFrom(merchant.status)) {
      throw new MerchantDomainError("INVALID_STATUS_TRANSITION");
    }

    const at = now();
    activateMerchantAggregate(merchant, at);
    await deps.merchants.update(merchant);

    const event = merchantActivatedEvent({
      merchantId: merchant.id,
      activatedAt: at,
      occurredAt: at,
    });

    return { merchant, event };
  }

  async function updateSettings(
    input: UpdateMerchantSettingsInput,
  ): Promise<UpdateMerchantSettingsResult> {
    const merchant = await deps.merchants.findById(input.merchantId);
    if (!merchant) {
      throw new MerchantDomainError("MERCHANT_NOT_FOUND");
    }

    const patch: Parameters<typeof applyMerchantProfile>[1] = {};

    if (input.tradeName !== undefined) {
      patch.tradeName = requireTradeName(input.tradeName);
    }
    if (input.slug !== undefined) {
      const slug = requireSlug(input.slug);
      if (slug !== merchant.slug) {
        const taken = await deps.merchants.findBySlug(slug);
        if (taken && taken.id !== merchant.id) {
          throw new MerchantDomainError("SLUG_TAKEN");
        }
        patch.slug = slug;
      }
    }
    if (input.contactPhone !== undefined) {
      const phone = optionalContactPhone(input.contactPhone);
      patch.contactPhoneNational = phone.national;
      patch.contactPhoneE164 = phone.e164;
    }
    if (input.settings !== undefined) {
      patch.settings = input.settings;
    }

    const at = now();
    const changedFields = applyMerchantProfile(merchant, patch, at);
    if (changedFields.length === 0) {
      throw new MerchantDomainError("NO_CHANGES");
    }

    await deps.merchants.update(merchant);

    const event = merchantUpdatedEvent({
      merchantId: merchant.id,
      changedFields,
      occurredAt: at,
    });

    return { merchant, event };
  }

  return { createMerchant, activateMerchant, updateSettings };
}

export type MerchantUseCases = ReturnType<typeof createMerchantUseCases>;
