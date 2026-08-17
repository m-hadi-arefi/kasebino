/**
 * ADR-037 — Event Naming and Schema Governance.
 *
 * Past-tense PascalCase eventType; versioned payloads; light in-repo
 * schema registry; catalog + store-first addendum authoritative.
 * Forbid command-like CreateX / UpdateX / DeleteX names.
 *
 * Normative prose: docs/architecture/event-catalog.md,
 * docs/architecture/event-catalog-store-first-addendum.md.
 */

import {
  assertPastTenseDomainEventName,
  isPastTenseDomainEventName,
} from "../../../shared/ddd/index.js";

/** ADR-037 Decision — binding naming + schema governance. */
export const EVENT_NAMING_DECISION = {
  pastTensePascalCase: true,
  versionedPayloads: true,
  payloadVersionField: "payloadVersion" as const,
  catalogAuthoritative: true,
  storeFirstAddendumAuthoritative: true,
  changesRequireDocUpdateSamePr: true,
  fullSchemaRegistryMvp: false,
  ciDocstringCheckOptionalLater: true,
  catalogDoc: "docs/architecture/event-catalog.md",
  storeFirstAddendumDoc:
    "docs/architecture/event-catalog-store-first-addendum.md",
} as const;

/**
 * Naming rules — wire/eventType English; ubiquitous language past tense.
 * Command-like CreateX / UpdateX / DeleteX / GetX are forbidden.
 */
export const EVENT_NAMING_RULES = {
  caseStyle: "PascalCase" as const,
  tense: "past" as const,
  pattern: /^[A-Z][A-Za-z0-9]+$/,
  /** Forbidden command-like prefixes (ADR-002 + ADR-037). */
  forbiddenPrefixes: [
    "Create",
    "Update",
    "Delete",
    "Get",
    "Set",
    "Send",
    "Fetch",
    "Save",
    "Upsert",
    "Handle",
  ] as const,
  examplesValid: [
    "SaleCompleted",
    "MembershipCreated",
    "InventoryChanged",
    "OrderReadyForPickup",
  ] as const,
  examplesInvalid: [
    "CreateSale",
    "UpdateInventory",
    "DeleteProduct",
    "createSale",
    "sale-completed",
  ] as const,
} as const;

/** Schema versioning — increment payloadVersion; tolerate unknown fields. */
export const EVENT_PAYLOAD_VERSIONING = {
  field: "payloadVersion" as const,
  minVersion: 1,
  defaultVersion: 1,
  incrementOnBreakingChange: true,
  consumersTolerateUnknownFields: true,
  expandContractCompatible: true,
  silentBreakingChangeForbidden: true,
  compatibilityWindowsDeferred: true,
} as const;

/**
 * Light schema registry — in-repo catalog is SoT; no Confluent/Apicurio MVP.
 * CI docstring check optional later (ADR-037 Implementation Requirements).
 */
export const EVENT_SCHEMA_REGISTRY = {
  mode: "in_repo_catalog_light" as const,
  authoritativeSources: [
    "docs/architecture/event-catalog.md",
    "docs/architecture/event-catalog-store-first-addendum.md",
    "src/events/contracts/event-naming",
  ] as const,
  externalRegistryForbiddenMvp: true,
  requireCatalogEntryForNewEvent: true,
  requireDocUpdateSamePr: true,
  requirePayloadVersion: true,
  minimizePiiInPayloads: true,
  allowPhoneInPayloadsForCrm: true,
  ciDocstringCheck: "optional_later" as const,
  warehouseMappingDependsOn: null,
  warehouseMappingPackage: "src/events/contracts/event-warehouse/",
  warehouseMappingAdr: "ADR-057",
} as const;

export type MvpEventDomain =
  | "merchant"
  | "store"
  | "catalog"
  | "inventory"
  | "crm"
  | "pos"
  | "loyalty"
  | "identity"
  | "ordering"
  | "payments"
  | "storefront"
  | "analytics";

export type MvpCatalogEntry = {
  eventType: string;
  domain: MvpEventDomain;
  payloadVersion: number;
  /** Implemented in src/modules today. */
  implemented: boolean;
  /** Out of MVP / delivery non-goal. */
  outOfMvp?: boolean;
  /** Prefer another catalog name when markdown drift exists. */
  preferredAliasOf?: string;
  source: "domain" | "catalog" | "store_first_addendum";
};

/**
 * Known MVP events — domains implemented + catalog + store-first addendum.
 * Prefer implemented domain names when catalog markdown drifts
 * (e.g. InventoryLowDetected over InventoryLow).
 */
export const MVP_EVENT_CATALOG: readonly MvpCatalogEntry[] = [
  // Merchant
  {
    eventType: "MerchantCreated",
    domain: "merchant",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "MerchantActivated",
    domain: "merchant",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "MerchantUpdated",
    domain: "merchant",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  // Store
  {
    eventType: "StoreCreated",
    domain: "store",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "StoreUpdated",
    domain: "store",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "StoreBrandingUpdated",
    domain: "store",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
  {
    eventType: "StoreQrGenerated",
    domain: "store",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
  {
    eventType: "StorePwaInstalled",
    domain: "analytics",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
  {
    eventType: "StorePwaInstallPromptShown",
    domain: "analytics",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
  // Catalog
  {
    eventType: "ProductCreated",
    domain: "catalog",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "ProductUpdated",
    domain: "catalog",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  {
    eventType: "ProductDeleted",
    domain: "catalog",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  // Inventory (domain names preferred over catalog InventoryLow / InventoryOutOfStock)
  {
    eventType: "StockAdjusted",
    domain: "inventory",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "InventoryChanged",
    domain: "inventory",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "InventoryLowDetected",
    domain: "inventory",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
    preferredAliasOf: "InventoryLow",
  },
  {
    eventType: "InventoryDepleted",
    domain: "inventory",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
    preferredAliasOf: "InventoryOutOfStock",
  },
  // CRM / membership (store-first membership owns customer relationship)
  {
    eventType: "MembershipCreated",
    domain: "crm",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "MembershipUpdated",
    domain: "crm",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "CustomerCreated",
    domain: "crm",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  {
    eventType: "CustomerUpdated",
    domain: "crm",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  {
    eventType: "CustomerDeleted",
    domain: "crm",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  {
    eventType: "CustomerReturned",
    domain: "crm",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  // POS
  {
    eventType: "SaleCreated",
    domain: "pos",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "SaleCompleted",
    domain: "pos",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "SaleCanceled",
    domain: "pos",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "SaleReturned",
    domain: "pos",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  // Ordering / pickup (ADR-011 / ADR-015 / ADR-082 — pickup only)
  {
    eventType: "OrderCreated",
    domain: "ordering",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "OrderPaid",
    domain: "ordering",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "OrderCanceled",
    domain: "ordering",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "OrderPreparing",
    domain: "ordering",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "OrderReadyForPickup",
    domain: "ordering",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "OrderPickedUp",
    domain: "ordering",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "OrderCompleted",
    domain: "ordering",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "OrderRefunded",
    domain: "ordering",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "PurchaseCompleted",
    domain: "ordering",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  {
    eventType: "OrderDelivered",
    domain: "ordering",
    payloadVersion: 1,
    implemented: false,
    outOfMvp: true,
    source: "catalog",
  },
  // Payments (ADR-012 — sandbox; OrderPaid remains primary fulfillment signal)
  {
    eventType: "PaymentIntentCreated",
    domain: "payments",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "PaymentSucceeded",
    domain: "payments",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "PaymentFailed",
    domain: "payments",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "PaymentRefunded",
    domain: "payments",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  // Loyalty
  {
    eventType: "PointsEarned",
    domain: "loyalty",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "PointsRedeemed",
    domain: "loyalty",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "PointsExpired",
    domain: "loyalty",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "CampaignCreated",
    domain: "loyalty",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  {
    eventType: "CampaignSent",
    domain: "loyalty",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  {
    eventType: "CampaignCompleted",
    domain: "loyalty",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  // Identity
  {
    eventType: "MerchantLoggedIn",
    domain: "identity",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "MerchantLoggedOut",
    domain: "identity",
    payloadVersion: 1,
    implemented: true,
    source: "domain",
  },
  {
    eventType: "CustomerLoggedIn",
    domain: "identity",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
  {
    eventType: "CustomerLoggedOut",
    domain: "identity",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
  // Storefront / product analytics
  {
    eventType: "StorefrontVisited",
    domain: "storefront",
    payloadVersion: 1,
    implemented: false,
    source: "catalog",
  },
  {
    eventType: "LoyaltyWalletViewed",
    domain: "analytics",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
  {
    eventType: "ReceiptViewed",
    domain: "analytics",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
  {
    eventType: "NavigateToStoreClicked",
    domain: "analytics",
    payloadVersion: 1,
    implemented: false,
    source: "store_first_addendum",
  },
] as const;

/** Event types allowed for MVP producers (excludes outOfMvp). */
export const MVP_EVENT_TYPES = MVP_EVENT_CATALOG.filter((e) => !e.outOfMvp).map(
  (e) => e.eventType,
);

/** Domain-implemented event types (src/modules). */
export const IMPLEMENTED_DOMAIN_EVENT_TYPES = MVP_EVENT_CATALOG.filter(
  (e) => e.implemented && !e.outOfMvp,
).map((e) => e.eventType);

/** Explicitly out of MVP — delivery non-goal (ADR-015 / ADR-082). */
export const DEPRECATED_MVP_EVENTS = {
  OrderDelivered: {
    eventType: "OrderDelivered" as const,
    reason: "delivery_non_goal",
    replacedBy: [
      "OrderPreparing",
      "OrderReadyForPickup",
      "OrderPickedUp",
      "OrderCompleted",
    ] as const,
    doNotImplementSubscribers: true,
  },
} as const;

/**
 * Iranian First — wire schemas English; user-visible copy Persian + RTL.
 * Presentation surfaces reused from ADR-036 stance.
 */
export const EVENT_NAMING_UX_FA = {
  wireSchemasEnglishOk: true,
  userVisibleToastsPersian: true,
  notificationDrawersRtl: true,
  dir: "rtl" as const,
  locale: "fa-IR" as const,
  SALE_COMPLETED_TOAST: "فروش با موفقیت ثبت شد.",
  PICKUP_READY_TOAST: "سفارش برای تحویل حضوری آماده است.",
  MEMBERSHIP_CREATED_TOAST: "عضویت مشتری ثبت شد.",
  NOTIFICATION_DRAWER_TITLE: "اعلان‌ها",
} as const;

const FORBIDDEN_PREFIX_RE =
  /^(Create|Update|Delete|Get|Set|Send|Fetch|Save|Upsert|Handle)/;

export function hasForbiddenCommandPrefix(eventType: string): boolean {
  return FORBIDDEN_PREFIX_RE.test(eventType);
}

export function isValidEventTypeName(eventType: string): boolean {
  return (
    isPastTenseDomainEventName(eventType) &&
    !hasForbiddenCommandPrefix(eventType)
  );
}

export function assertValidEventTypeName(eventType: string): void {
  if (hasForbiddenCommandPrefix(eventType)) {
    throw new Error(
      `Event type "${eventType}" uses a forbidden command-like CreateX/UpdateX/… prefix (ADR-037). Use past-tense PascalCase, e.g. SaleCompleted.`,
    );
  }
  assertPastTenseDomainEventName(eventType);
}

export function assertPayloadVersion(version: number): void {
  if (
    !Number.isInteger(version) ||
    version < EVENT_PAYLOAD_VERSIONING.minVersion
  ) {
    throw new Error(
      `payloadVersion must be an integer ≥ ${EVENT_PAYLOAD_VERSIONING.minVersion} (ADR-037); got ${version}.`,
    );
  }
}

export function assertBreakingChangeBumpsVersion(input: {
  breakingChange: boolean;
  previousVersion: number;
  nextVersion: number;
}): void {
  assertPayloadVersion(input.previousVersion);
  assertPayloadVersion(input.nextVersion);
  if (input.breakingChange && input.nextVersion <= input.previousVersion) {
    throw new Error(
      `Breaking payload changes must increment payloadVersion (ADR-037); ${input.previousVersion} → ${input.nextVersion}.`,
    );
  }
}

export function findCatalogEntry(
  eventType: string,
): MvpCatalogEntry | undefined {
  return MVP_EVENT_CATALOG.find((e) => e.eventType === eventType);
}

export function assertEventInMvpCatalog(eventType: string): void {
  assertValidEventTypeName(eventType);
  const entry = findCatalogEntry(eventType);
  if (!entry) {
    throw new Error(
      `Event type "${eventType}" is not in the MVP catalog (ADR-037). Update event-catalog.md / store-first addendum and src/event-naming in the same PR.`,
    );
  }
  if (entry.outOfMvp) {
    throw new Error(
      `Event type "${eventType}" is out of MVP (ADR-037 / ADR-015). Do not implement producers/subscribers.`,
    );
  }
}

export function assertCatalogDocUpdatedWithChange(docUpdatedSamePr: boolean): void {
  if (!docUpdatedSamePr) {
    throw new Error(
      "Event catalog / payload schema changes require doc update in the same PR/ARD (ADR-037).",
    );
  }
}

export function nextPayloadVersion(current: number): number {
  assertPayloadVersion(current);
  return current + 1;
}

export const EVENT_NAMING = {
  decision: EVENT_NAMING_DECISION,
  naming: EVENT_NAMING_RULES,
  versioning: EVENT_PAYLOAD_VERSIONING,
  registry: EVENT_SCHEMA_REGISTRY,
  catalog: MVP_EVENT_CATALOG,
  mvpEventTypes: MVP_EVENT_TYPES,
  implementedDomainEventTypes: IMPLEMENTED_DOMAIN_EVENT_TYPES,
  deprecated: DEPRECATED_MVP_EVENTS,
  uxFa: EVENT_NAMING_UX_FA,
} as const;
