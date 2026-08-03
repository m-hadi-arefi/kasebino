/**
 * StoreMembership aggregate root (ADR-007).
 * Store owns the customer relationship; unique (storeId, phone) while active.
 * Customer identity (phone / customerId) is separate from merchant AuthUser.
 */

import type {
  MembershipSource,
  MembershipStatus,
} from "../../../crm-membership/index.js";
import type { MembershipConsent } from "./consent.js";

export type StoreMembership = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  /** Platform customer identity id (phone-authenticated person). */
  readonly customerId: string;
  /** Normalized Iranian national mobile `09xxxxxxxxx`. */
  phoneNational: string;
  /** E.164 `+989xxxxxxxxx`. */
  phoneE164: string;
  source: MembershipSource;
  status: MembershipStatus;
  consent: MembershipConsent;
  readonly joinedAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateStoreMembershipAggregateInput = {
  id: string;
  merchantId: string;
  storeId: string;
  customerId: string;
  phoneNational: string;
  phoneE164: string;
  source: MembershipSource;
  consent: MembershipConsent;
  status?: MembershipStatus;
  now?: Date;
};

export function createStoreMembershipAggregate(
  input: CreateStoreMembershipAggregateInput,
): StoreMembership {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId,
    customerId: input.customerId,
    phoneNational: input.phoneNational,
    phoneE164: input.phoneE164,
    source: input.source,
    status: input.status ?? "active",
    consent: input.consent,
    joinedAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function applyMembershipConsent(
  membership: StoreMembership,
  consent: MembershipConsent,
  at: Date = new Date(),
): void {
  membership.consent = consent;
  membership.updatedAt = at;
}

export function softDeleteMembership(
  membership: StoreMembership,
  at: Date = new Date(),
): void {
  membership.deletedAt = at;
  membership.status = "inactive";
  membership.updatedAt = at;
}

export function isMembershipActive(membership: StoreMembership): boolean {
  return membership.deletedAt === null && membership.status === "active";
}
