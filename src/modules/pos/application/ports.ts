/**
 * Application ports for CompleteSale orchestration (ADR-009).
 * Membership → ADR-007 CRM; inventory decrement → ADR-008/049;
 * loyalty earn → ADR-010 `createLoyaltyEarnPort`.
 */

export type MembershipUpsertPortResult = {
  membershipId: string;
  customerId: string;
  phoneNational: string;
  created: boolean;
};

export type MembershipUpsertPort = {
  upsertFromPosPhoneCapture(input: {
    merchantId: string;
    storeId: string;
    phone: string;
    consentNoticeVersion?: string;
  }): Promise<MembershipUpsertPortResult>;
};

export type InventoryDecrementPort = {
  /**
   * Must run inside CompleteSale TX when wired to Drizzle (ADR-049).
   * Domain gate: `sameTransaction` must be true.
   */
  decrementForSale(input: {
    merchantId: string;
    storeId: string;
    productId: string;
    quantity: number;
    sameTransaction: true;
  }): Promise<void>;
};

/**
 * Loyalty earn port — implement via `createLoyaltyEarnPort` (ADR-010).
 * Optional: CompleteSale may call when provided; no-op otherwise.
 */
export type LoyaltyEarnPort = {
  earnForSale(input: {
    saleId: string;
    merchantId: string;
    storeId: string;
    membershipId: string;
    customerId: string;
    totalAmountMinor: bigint;
  }): Promise<void>;
};

/**
 * Analytics after-sale port (ADR-065).
 * Optional fire-and-forget enqueue after OLTP persist — must never fail CompleteSale.
 * Prefer `createAnalyticsAfterSalePort` from `src/analytics-ingest-isolation/`.
 */
export type AnalyticsAfterSalePort = {
  enqueueSaleCompleted(input: {
    eventId: string;
    saleId: string;
    merchantId: string;
    storeId: string;
    occurredAt: Date | string;
    payload: Record<string, unknown>;
    correlationId?: string;
  }): Promise<void>;
};
