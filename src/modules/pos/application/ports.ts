/**
 * Application ports for CompleteSale orchestration (ADR-009).
 * Membership → ADR-007 CRM; inventory decrement → ADR-008/049;
 * loyalty earn → ADR-010 `createLoyaltyEarnPort`.
 */

export type MembershipDomainEvent = {
  eventName: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

export type MembershipUpsertPortResult = {
  membershipId: string;
  customerId: string;
  phoneNational: string;
  created: boolean;
  /** ADR-137 — enqueue MembershipCreated/Updated for ERP party sync. */
  event?: MembershipDomainEvent;
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
    /** ADR-126 — stock movement reference */
    saleId?: string;
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
 * Prefer `createAnalyticsAfterSalePort` from `src/infrastructure/mongodb/contracts/ingest-isolation/`.
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

/**
 * Optional OLTP Unit of Work (ADR-126).
 * Must wrap membership + inventory + loyalty + sale + outbox only.
 * Must NOT wrap MinIO, analytics, ERPNext HTTP, or MQTT.
 */
export type RunInUnitOfWork = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 * Transactional outbox enqueue (ADR-035 / ADR-096 / ADR-126).
 * Wired from composition; optional in unit tests.
 */
export type SaleOutboxPort = {
  enqueueSaleEvents(input: {
    createdEvent: {
      eventName: string;
      aggregateId: string;
      aggregateType: string;
      occurredAt: Date;
      payload: Record<string, unknown>;
    };
    completedEvent: {
      eventName: string;
      aggregateId: string;
      aggregateType: string;
      occurredAt: Date;
      payload: Record<string, unknown>;
    };
    membershipEvent?: MembershipDomainEvent;
    merchantId: string;
    storeId: string;
  }): Promise<void>;
  /**
   * ADR-126 — on idempotent sale replay, re-enqueue SaleCompleted if missing
   * so accounting sync cannot be permanently orphaned.
   */
  ensureSaleCompletedEnqueued?(input: {
    completedEvent: {
      eventName: string;
      aggregateId: string;
      aggregateType: string;
      occurredAt: Date;
      payload: Record<string, unknown>;
    };
    merchantId: string;
    storeId: string;
  }): Promise<void>;
};
