/**
 * ADR-003 — Bounded Context Design (context map contract).
 * Source narrative: docs/architecture/03-bounded-contexts.md
 */

import { DEFAULT_FULFILLMENT_MODE } from "../product-architecture/index.js";

export type IntegrationStyle =
  | "open_host_service"
  | "anti_corruption_layer"
  | "partnership"
  | "conformist"
  | "customer_supplier"
  | "shared_kernel";

export type ContextPlane = "postgresql_oltp" | "mongodb_analytics" | "realtime" | "cross_cutting";

export type BoundedContextDefinition = {
  id: string;
  title: string;
  /** Module folder under src/modules/ */
  module: string;
  plane: ContextPlane;
  audience: "merchant" | "customer" | "platform" | "shared";
  /** Short ubiquitous-language terms (English code identifiers). */
  language: readonly string[];
};

/**
 * Canonical MVP contexts from ADR-003 Decision.
 * Module folders align with ADR-002 scaffolding (+ customer-identity).
 */
export const BOUNDED_CONTEXTS = [
  {
    id: "identity_merchant",
    title: "Identity (merchant)",
    module: "identity",
    plane: "postgresql_oltp",
    audience: "merchant",
    language: ["AuthUser", "OtpChallenge", "Session", "Role"],
  },
  {
    id: "identity_customer",
    title: "Customer Identity",
    module: "customer-identity",
    plane: "postgresql_oltp",
    audience: "customer",
    language: ["CustomerAuthUser", "CustomerOtpChallenge"],
  },
  {
    id: "merchant",
    title: "Merchant",
    module: "merchant",
    plane: "postgresql_oltp",
    audience: "merchant",
    language: ["Merchant", "MerchantSettings", "Plan"],
  },
  {
    id: "store",
    title: "Store",
    module: "store",
    plane: "postgresql_oltp",
    audience: "merchant",
    language: ["Store", "Hours", "StoreBranding", "StoreSlug"],
  },
  {
    id: "catalog",
    title: "Catalog",
    module: "catalog",
    plane: "postgresql_oltp",
    audience: "shared",
    language: ["Product", "SKU", "Barcode", "Category"],
  },
  {
    id: "inventory",
    title: "Inventory",
    module: "inventory",
    plane: "postgresql_oltp",
    audience: "merchant",
    language: ["StockItem", "Reservation"],
  },
  {
    id: "pos_sales",
    title: "POS/Sales",
    module: "pos",
    plane: "postgresql_oltp",
    audience: "merchant",
    language: ["Cart", "Sale", "Receipt", "LineItem"],
  },
  {
    id: "crm_membership",
    title: "CRM/Membership",
    module: "crm",
    plane: "postgresql_oltp",
    audience: "merchant",
    language: ["Customer", "StoreMembership", "Segment"],
  },
  {
    id: "loyalty",
    title: "Loyalty",
    module: "loyalty",
    plane: "postgresql_oltp",
    audience: "shared",
    language: ["PointsLedger", "Wallet", "Coupon", "Reward"],
  },
  {
    id: "ordering_pickup",
    title: "Ordering (Pickup)",
    module: "ordering",
    plane: "postgresql_oltp",
    audience: "customer",
    language: ["Order", "OrderLine", "Fulfillment"],
  },
  {
    id: "payments",
    title: "Payments",
    module: "payments",
    plane: "postgresql_oltp",
    audience: "shared",
    language: ["PaymentIntent", "Capture"],
  },
  {
    id: "analytics_oltp",
    title: "Analytics (OLTP)",
    module: "analytics",
    plane: "postgresql_oltp",
    audience: "merchant",
    language: ["MerchantOverviewStats", "RetentionStats"],
  },
  {
    id: "analytics_platform",
    title: "Analytics (Platform/Mongo)",
    module: "analytics",
    plane: "mongodb_analytics",
    audience: "platform",
    language: ["WarehouseEvent", "ProductAnalytics", "SessionAnalytics"],
  },
  {
    id: "notifications",
    title: "Notifications",
    module: "notifications",
    plane: "cross_cutting",
    audience: "shared",
    language: ["Notification", "Channel", "NotificationOutbox"],
  },
  {
    id: "admin",
    title: "Admin",
    module: "admin",
    plane: "postgresql_oltp",
    audience: "platform",
    language: ["AdminUser", "AdminAction", "Enforcement"],
  },
  {
    id: "realtime",
    title: "Realtime",
    module: "realtime",
    plane: "realtime",
    audience: "shared",
    language: ["MqttTopic", "RealtimePublish"],
  },
] as const satisfies readonly BoundedContextDefinition[];

export type BoundedContextId = (typeof BOUNDED_CONTEXTS)[number]["id"];

/** Support modules scaffolded for ADR-002 that are not standalone Decision contexts. */
export const SUPPORT_MODULES = ["audit", "platform"] as const;

export type ContextRelation = {
  from: BoundedContextId;
  to: BoundedContextId;
  style: IntegrationStyle;
  note?: string;
};

/** Context map edges from docs/architecture/03-bounded-contexts.md (+ identity split). */
export const CONTEXT_INTEGRATIONS = [
  {
    from: "identity_merchant",
    to: "merchant",
    style: "customer_supplier",
    note: "Merchant actor authenticated via merchant identity",
  },
  {
    from: "identity_customer",
    to: "crm_membership",
    style: "customer_supplier",
    note: "Customer OTP audience separate from merchant staff",
  },
  {
    from: "merchant",
    to: "store",
    style: "open_host_service",
  },
  {
    from: "store",
    to: "catalog",
    style: "open_host_service",
  },
  {
    from: "catalog",
    to: "inventory",
    style: "partnership",
  },
  {
    from: "pos_sales",
    to: "catalog",
    style: "open_host_service",
  },
  {
    from: "pos_sales",
    to: "inventory",
    style: "open_host_service",
  },
  {
    from: "pos_sales",
    to: "crm_membership",
    style: "conformist",
    note: "POS orchestrates membership upsert via application services/events",
  },
  {
    from: "pos_sales",
    to: "loyalty",
    style: "conformist",
  },
  {
    from: "crm_membership",
    to: "loyalty",
    style: "partnership",
  },
  {
    from: "ordering_pickup",
    to: "catalog",
    style: "anti_corruption_layer",
    note: "Storefront maps catalog via ACL DTOs — never POS domain",
  },
  {
    from: "ordering_pickup",
    to: "payments",
    style: "partnership",
  },
  {
    from: "ordering_pickup",
    to: "inventory",
    style: "partnership",
  },
  {
    from: "analytics_oltp",
    to: "pos_sales",
    style: "conformist",
    note: "Consumes Sale* events for merchant OLTP dashboards",
  },
  {
    from: "analytics_platform",
    to: "pos_sales",
    style: "conformist",
    note: "Mongo warehouse mirrors domain events — never OLTP SoT",
  },
  {
    from: "notifications",
    to: "pos_sales",
    style: "conformist",
  },
  {
    from: "admin",
    to: "merchant",
    style: "open_host_service",
  },
  {
    from: "realtime",
    to: "ordering_pickup",
    style: "conformist",
  },
] as const satisfies readonly ContextRelation[];

/** UI surfaces that must ACL into domains — never import POS internals. */
export const STOREFRONT_ACL = {
  surface: "storefront",
  allowedModules: ["catalog", "ordering", "customer-identity", "loyalty", "store"] as const,
  forbiddenDomainImports: ["pos"] as const,
  rule: "Storefront and Admin UIs must not import POS domain internals; map via application DTOs (ADR-003).",
} as const;

export const ADMIN_ACL = {
  surface: "admin",
  forbiddenDomainImports: ["pos"] as const,
  rule: STOREFRONT_ACL.rule,
} as const;

export const ORDERING_CONTEXT_POLICY = {
  contextId: "ordering_pickup" as const,
  fulfillmentMode: DEFAULT_FULFILLMENT_MODE,
  forbiddenFulfillmentModes: ["delivery", "courier", "shipping"] as const,
} as const;

export function getContextById(id: BoundedContextId) {
  const ctx = BOUNDED_CONTEXTS.find((c) => c.id === id);
  if (!ctx) {
    throw new Error(`Unknown bounded context: ${id}`);
  }
  return ctx;
}

export function moduleForContext(id: BoundedContextId): string {
  return getContextById(id).module;
}

export function isForbiddenUiDomainImport(
  surface: "storefront" | "admin",
  moduleName: string,
): boolean {
  const list =
    surface === "storefront"
      ? STOREFRONT_ACL.forbiddenDomainImports
      : ADMIN_ACL.forbiddenDomainImports;
  return (list as readonly string[]).includes(moduleName);
}

export function assertUiMayImportDomain(
  surface: "storefront" | "admin",
  moduleName: string,
): void {
  if (isForbiddenUiDomainImport(surface, moduleName)) {
    throw new Error(
      `${surface} must not import ${moduleName} domain (${STOREFRONT_ACL.rule})`,
    );
  }
}

export const CONTEXT_MAP = {
  contexts: BOUNDED_CONTEXTS,
  integrations: CONTEXT_INTEGRATIONS,
  storefrontAcl: STOREFRONT_ACL,
  adminAcl: ADMIN_ACL,
  ordering: ORDERING_CONTEXT_POLICY,
  supportModules: SUPPORT_MODULES,
  publishedLanguage: "domain_events",
} as const;
