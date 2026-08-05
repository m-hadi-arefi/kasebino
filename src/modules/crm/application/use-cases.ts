import { randomUUID } from "node:crypto";

import {
  CRM_MEMBERSHIP_DECISION,
  DIGITAL_CONSENT_CHECKBOX_LABEL_FA,
  POS_PHONE_CONSENT_NOTICE_FA,
  isDigitalMembershipSource,
  type MembershipSource,
} from "../../../crm-membership/index.js";
import type { Sale } from "../../pos/domain/sale.js";
import type { SaleRepository } from "../../pos/domain/repositories.js";
import { normalizeIranianMobile } from "../../../shared/domain/iranian-phone.js";
import { createMembershipConsent } from "../domain/consent.js";
import {
  membershipCreatedEvent,
  membershipUpdatedEvent,
} from "../domain/events.js";
import type { StoreMembershipRepository } from "../domain/repositories.js";
import {
  computeEngagementStats,
  type CrmSegment,
  type MembershipEngagementStats,
} from "../domain/segments.js";
import {
  applyMembershipConsent,
  createStoreMembershipAggregate,
  softDeleteMembership as softDeleteMembershipAggregate,
  type StoreMembership,
} from "../domain/store-membership.js";
import { CrmDomainError } from "./errors.js";

export { DIGITAL_CONSENT_CHECKBOX_LABEL_FA, POS_PHONE_CONSENT_NOTICE_FA };

export type CrmUseCaseDeps = {
  memberships: StoreMembershipRepository;
  /** Required for profile / history / segments (ADR-098). */
  sales: SaleRepository;
  now?: () => Date;
  idFactory?: () => string;
  /** Stable customer id from phone — default: new UUID per first sighting. */
  customerIdForPhone?: (phoneNational: string) => string | Promise<string>;
};

export type UpsertFromPosPhoneCaptureInput = {
  merchantId: string;
  storeId: string;
  phone: string;
  /**
   * Optional notice version override (default `pos-consent-v1`).
   * Continuing checkout records consent — no checkbox flag required.
   */
  consentNoticeVersion?: string;
};

export type UpsertFromPosPhoneCaptureResult =
  | {
      membership: StoreMembership;
      created: true;
      event: ReturnType<typeof membershipCreatedEvent>;
      consentNoticeFa: string;
    }
  | {
      membership: StoreMembership;
      created: false;
      event: ReturnType<typeof membershipUpdatedEvent>;
      consentNoticeFa: string;
    };

export type JoinWithDigitalConsentInput = {
  merchantId: string;
  storeId: string;
  phone: string;
  source: Exclude<MembershipSource, "pos">;
  /** Explicit checkbox required before OTP join (ADR-091). */
  consentCheckboxAccepted: boolean;
  consentCheckboxVersion?: string;
};

export type JoinWithDigitalConsentResult =
  | {
      membership: StoreMembership;
      created: true;
      event: ReturnType<typeof membershipCreatedEvent>;
      consentCheckboxLabelFa: string;
    }
  | {
      membership: StoreMembership;
      created: false;
      event: ReturnType<typeof membershipUpdatedEvent>;
      consentCheckboxLabelFa: string;
    };

export type SoftDeleteMembershipInput = {
  membershipId: string;
};

export type SoftDeleteMembershipResult = {
  membership: StoreMembership;
  event: ReturnType<typeof membershipUpdatedEvent>;
};

export type MembershipListItem = {
  membership: StoreMembership;
  engagement: MembershipEngagementStats;
};

export type MembershipProfileResult = {
  membership: StoreMembership;
  engagement: MembershipEngagementStats;
};

export type MembershipHistoryResult = {
  membership: StoreMembership;
  sales: Sale[];
};

export type StoreSegmentsResult = {
  storeId: string;
  counts: Record<CrmSegment, number>;
  totalActive: number;
};

function requireTenantIds(merchantId: string, storeId: string): {
  merchantId: string;
  storeId: string;
} {
  const m = merchantId.trim();
  const s = storeId.trim();
  if (!m) throw new CrmDomainError("INVALID_MERCHANT");
  if (!s) throw new CrmDomainError("INVALID_STORE");
  return { merchantId: m, storeId: s };
}

function requireIranianPhone(raw: string): {
  phoneNational: string;
  phoneE164: string;
} {
  const result = normalizeIranianMobile(raw);
  if (!result.ok) {
    throw new CrmDomainError("INVALID_PHONE");
  }
  return {
    phoneNational: result.phone.national,
    phoneE164: result.phone.e164,
  };
}

export function createCrmUseCases(deps: CrmUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());
  const customerIds = new Map<string, string>();

  function toSaleRefs(sales: Sale[]) {
    return sales
      .filter((s) => s.completedAt !== null)
      .map((s) => ({
        completedAt: s.completedAt!,
        totalAmountMinor: s.totalAmountMinor,
      }));
  }

  async function salesByMembershipMap(
    storeId: string,
  ): Promise<Map<string, Sale[]>> {
    const storeSales = await deps.sales.listCompletedByStoreId(storeId);
    const map = new Map<string, Sale[]>();
    for (const sale of storeSales) {
      if (!sale.membershipId) continue;
      const list = map.get(sale.membershipId) ?? [];
      list.push(sale);
      map.set(sale.membershipId, list);
    }
    return map;
  }

  async function resolveCustomerId(phoneNational: string): Promise<string> {
    if (deps.customerIdForPhone) {
      return deps.customerIdForPhone(phoneNational);
    }
    const existing = customerIds.get(phoneNational);
    if (existing) return existing;
    const id = idFactory();
    customerIds.set(phoneNational, id);
    return id;
  }

  async function upsertMembership(input: {
    merchantId: string;
    storeId: string;
    phoneNational: string;
    phoneE164: string;
    source: MembershipSource;
    consentSurface: "pos_notice_continue" | "digital_checkbox";
    consentVersion: string;
  }): Promise<
    | {
        membership: StoreMembership;
        created: true;
        event: ReturnType<typeof membershipCreatedEvent>;
      }
    | {
        membership: StoreMembership;
        created: false;
        event: ReturnType<typeof membershipUpdatedEvent>;
      }
  > {
    const at = now();
    const consent = createMembershipConsent({
      surface: input.consentSurface,
      version: input.consentVersion,
      consentedAt: at,
    });

    const existing = await deps.memberships.findByStoreAndPhone(
      input.storeId,
      input.phoneNational,
    );

    if (existing) {
      if (existing.merchantId !== input.merchantId) {
        throw new CrmDomainError("INVALID_MERCHANT");
      }
      if (existing.status === "suspended") {
        throw new CrmDomainError("MEMBERSHIP_SUSPENDED");
      }

      // Preserve original join source; refresh consent audit only.
      applyMembershipConsent(existing, consent, at);
      const changedFields = ["consent"];

      await deps.memberships.update(existing);

      const event = membershipUpdatedEvent({
        membershipId: existing.id,
        merchantId: existing.merchantId,
        storeId: existing.storeId,
        customerId: existing.customerId,
        changedFields,
        occurredAt: at,
      });

      return { membership: existing, created: false, event };
    }

    const customerId = await resolveCustomerId(input.phoneNational);
    const membership = createStoreMembershipAggregate({
      id: idFactory(),
      merchantId: input.merchantId,
      storeId: input.storeId,
      customerId,
      phoneNational: input.phoneNational,
      phoneE164: input.phoneE164,
      source: input.source,
      consent,
      status: "active",
      now: at,
    });

    await deps.memberships.save(membership);

    const event = membershipCreatedEvent({
      membershipId: membership.id,
      merchantId: membership.merchantId,
      storeId: membership.storeId,
      customerId: membership.customerId,
      phoneNational: membership.phoneNational,
      source: membership.source,
      consentSurface: membership.consent.surface,
      consentVersion: membership.consent.version,
      occurredAt: at,
    });

    return { membership, created: true, event };
  }

  /**
   * POS phone capture → upsert StoreMembership.
   * Continuing checkout equals consent (ADR-091); no checkbox parameter.
   */
  async function upsertFromPosPhoneCapture(
    input: UpsertFromPosPhoneCaptureInput,
  ): Promise<UpsertFromPosPhoneCaptureResult> {
    const { merchantId, storeId } = requireTenantIds(
      input.merchantId,
      input.storeId,
    );
    const { phoneNational, phoneE164 } = requireIranianPhone(input.phone);
    const consentVersion =
      input.consentNoticeVersion?.trim() ||
      CRM_MEMBERSHIP_DECISION.consent.defaultNoticeVersion;

    const result = await upsertMembership({
      merchantId,
      storeId,
      phoneNational,
      phoneE164,
      source: "pos",
      consentSurface: "pos_notice_continue",
      consentVersion,
    });

    return {
      ...result,
      consentNoticeFa: POS_PHONE_CONSENT_NOTICE_FA,
    };
  }

  /**
   * QR / storefront / pickup digital join — explicit checkbox required.
   */
  async function joinWithDigitalConsent(
    input: JoinWithDigitalConsentInput,
  ): Promise<JoinWithDigitalConsentResult> {
    const { merchantId, storeId } = requireTenantIds(
      input.merchantId,
      input.storeId,
    );

    if (!isDigitalMembershipSource(input.source)) {
      throw new CrmDomainError("INVALID_SOURCE");
    }

    if (!input.consentCheckboxAccepted) {
      throw new CrmDomainError("CONSENT_REQUIRED");
    }

    const { phoneNational, phoneE164 } = requireIranianPhone(input.phone);
    const consentVersion =
      input.consentCheckboxVersion?.trim() ||
      CRM_MEMBERSHIP_DECISION.consent.defaultDigitalCheckboxVersion;

    const result = await upsertMembership({
      merchantId,
      storeId,
      phoneNational,
      phoneE164,
      source: input.source,
      consentSurface: "digital_checkbox",
      consentVersion,
    });

    return {
      ...result,
      consentCheckboxLabelFa: DIGITAL_CONSENT_CHECKBOX_LABEL_FA,
    };
  }

  async function softDeleteMembership(
    input: SoftDeleteMembershipInput,
  ): Promise<SoftDeleteMembershipResult> {
    const membership = await deps.memberships.findById(input.membershipId);
    if (!membership || membership.deletedAt !== null) {
      throw new CrmDomainError("MEMBERSHIP_NOT_FOUND");
    }

    const at = now();
    softDeleteMembershipAggregate(membership, at);
    await deps.memberships.update(membership);

    const event = membershipUpdatedEvent({
      membershipId: membership.id,
      merchantId: membership.merchantId,
      storeId: membership.storeId,
      customerId: membership.customerId,
      changedFields: ["deletedAt", "status"],
      occurredAt: at,
    });

    return { membership, event };
  }

  /**
   * Active memberships for a store with on-read engagement + segment.
   * Soft-deleted excluded via repository default.
   */
  async function listStoreMemberships(input: {
    merchantId: string;
    storeId: string;
    segment?: CrmSegment;
  }): Promise<{ items: MembershipListItem[] }> {
    const { merchantId, storeId } = requireTenantIds(
      input.merchantId,
      input.storeId,
    );
    const at = now();
    const memberships = await deps.memberships.listByStoreId(storeId, {
      merchantId,
    });
    const salesMap = await salesByMembershipMap(storeId);
    const items: MembershipListItem[] = memberships.map((membership) => {
      const sales = salesMap.get(membership.id) ?? [];
      return {
        membership,
        engagement: computeEngagementStats({
          completedSales: toSaleRefs(sales),
          now: at,
        }),
      };
    });

    if (input.segment !== undefined) {
      return {
        items: items.filter((i) => i.engagement.segment === input.segment),
      };
    }
    return { items };
  }

  async function getMembershipProfile(input: {
    membershipId: string;
  }): Promise<MembershipProfileResult> {
    const membership = await deps.memberships.findById(input.membershipId);
    if (!membership || membership.deletedAt !== null) {
      throw new CrmDomainError("MEMBERSHIP_NOT_FOUND");
    }
    const sales = await deps.sales.listCompletedByMembershipId(membership.id);
    return {
      membership,
      engagement: computeEngagementStats({
        completedSales: toSaleRefs(sales),
        now: now(),
      }),
    };
  }

  async function listMembershipHistory(input: {
    membershipId: string;
  }): Promise<MembershipHistoryResult> {
    const membership = await deps.memberships.findById(input.membershipId);
    if (!membership || membership.deletedAt !== null) {
      throw new CrmDomainError("MEMBERSHIP_NOT_FOUND");
    }
    const sales = await deps.sales.listCompletedByMembershipId(membership.id);
    return { membership, sales };
  }

  async function getStoreSegments(input: {
    merchantId: string;
    storeId: string;
  }): Promise<StoreSegmentsResult> {
    const { merchantId, storeId } = requireTenantIds(
      input.merchantId,
      input.storeId,
    );
    const { items } = await listStoreMemberships({ merchantId, storeId });
    const counts: Record<CrmSegment, number> = {
      new: 0,
      returning: 0,
      lapsed: 0,
    };
    for (const item of items) {
      counts[item.engagement.segment] += 1;
    }
    return {
      storeId,
      counts,
      totalActive: items.length,
    };
  }

  return {
    upsertFromPosPhoneCapture,
    joinWithDigitalConsent,
    softDeleteMembership,
    listStoreMemberships,
    getMembershipProfile,
    listMembershipHistory,
    getStoreSegments,
  };
}

export type CrmUseCases = ReturnType<typeof createCrmUseCases>;
