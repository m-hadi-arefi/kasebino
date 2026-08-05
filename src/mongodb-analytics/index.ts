/**
 * ADR-056 — MongoDB Analytics and Telemetry Plane.
 *
 * MongoDB holds warehouse, audit, clickstream, product analytics, security
 * signals, and management rollups. It is never the OLTP source of truth for
 * money, stock, or membership — PostgreSQL + Drizzle remain OLTP SoT.
 *
 * Adapter access only (analytics/audit modules). Warehouse ingest →
 * `src/event-warehouse/` (ADR-057). Failure isolation from checkout → ADR-065
 * (`src/analytics-ingest-isolation/`). Official Mongo protocol driver optional
 * later when adapters connect for real.
 *
 * Normative: docs/architecture/mongodb-architecture.md,
 * docs/tech/mongodb.md, docs/rules/mongodb-rules.md.
 */

import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_SERVICE_PORTS,
} from "../docker-compose-parity/index.js";
import {
  ANALYTICS_BOUNDARIES_DECISION,
  MONGO_ANALYTICS_PLANE,
} from "../analytics-boundaries/index.js";
import { PRODUCT_ARCHITECTURE } from "../product-architecture/index.js";

/** Engine identity — analytics / audit / telemetry plane (compose pins Mongo 7). */
export const MONGO_ENGINE = {
  name: "mongodb",
  role: "analytics_audit_telemetry_only",
  plane: "mongodb_analytics",
  channel: "latest_stable",
  /** Local parity image major from ADR-066 compose. */
  composeImageMajor: 7,
  composePort: COMPOSE_SERVICE_PORTS.mongo[0],
  defaultDatabase: "merchantos_analytics",
  soleSourceOfTruth: false,
  neverOltpSourceOfTruth: true,
} as const;

/**
 * Forbidden Mongo usages — Mongo must not replace PostgreSQL OLTP.
 */
export const FORBIDDEN_MONGO = {
  asOltpSourceOfTruth: false,
  asMoneyStockSot: false,
  asMembershipSot: false,
  asAuthoritativeLedger: false,
  drizzleOrmOnMongo: false,
  domainOltpModuleImportsDriver: false,
} as const;

/**
 * Logical collection naming locked at ADR-056 (mongodb-architecture.md).
 * Prefix `mos_` = MerchantOS analytics plane.
 */
export const MONGO_COLLECTIONS = {
  events: "mos_events",
  audit: "mos_audit",
  product: "mos_product",
  behavior: "mos_behavior",
  security: "mos_security",
  mgmt: "mos_mgmt",
} as const;

export type MongoCollectionName =
  (typeof MONGO_COLLECTIONS)[keyof typeof MONGO_COLLECTIONS];

export const MONGO_COLLECTION_PURPOSES = {
  [MONGO_COLLECTIONS.events]: "domain_event_warehouse_envelopes",
  [MONGO_COLLECTIONS.audit]: "security_compliance_audit_documents",
  [MONGO_COLLECTIONS.product]: "product_analytics_feature_usage",
  [MONGO_COLLECTIONS.behavior]: "clickstream_page_views",
  [MONGO_COLLECTIONS.security]: "auth_anomalies_abuse_signals",
  [MONGO_COLLECTIONS.mgmt]: "preaggregated_management_dashboards",
} as const;

/** Dedicated session-aggregate collection (ADR-061) — not in locked ADR-056 enum. */
export const MONGO_SESSION_COLLECTION = "mos_sessions" as const;

/**
 * Canonical analytics/telemetry document envelope fields
 * (docs/architecture/mongodb-architecture.md).
 */
export const DOCUMENT_ENVELOPE_FIELDS = [
  "eventId",
  "eventType",
  "occurredAt",
  "ingestedAt",
  "merchantId",
  "storeId",
  "actorId",
  "actorRole",
  "sessionId",
  "anonymousId",
  "correlationId",
  "causationId",
  "source",
  "schemaVersion",
  "payload",
] as const;

export const DOCUMENT_ENVELOPE = {
  requiredFields: DOCUMENT_ENVELOPE_FIELDS,
  idempotencyKey: "eventId",
  schemaVersionStartsAt: 1,
  occurredAtStorage: "utc_iso8601",
  /** Merchant-facing Jalali buckets are a presentation concern (ADR-014). */
  merchantFacingTimeBuckets: "jalali_asia_tehran_presentation",
} as const;

/**
 * Connection — all envs use MONGODB_URL (ADR-066 compose + .env.example).
 * Architecture prose sometimes says MONGODB_URI; runtime key is MONGODB_URL.
 */
export const CONNECTION = {
  envVar: "MONGODB_URL",
  documentedIn: [COMPOSE_FILES.envExample, COMPOSE_FILES.compose] as const,
  optionalLegacyAlias: "MONGODB_URI",
  scheme: "mongodb://",
  tlsScheme: "mongodb+srv://",
  defaultDatabase: MONGO_ENGINE.defaultDatabase,
} as const;

/**
 * Multi-tenancy + authZ — merchant docs filter by merchantId;
 * platform/mgmt collections require platform_admin + access audit.
 */
export const TENANCY_AND_AUTHZ = {
  merchantScopedMustIncludeMerchantId: true,
  merchantQueriesMustFilterMerchantId: true,
  platformDocumentsMayOmitMerchantId: true,
  platformAudience: "platform_admin" as const,
  platformAccessMustBeAudited: true,
  crossTenantAggAdminOnly: true,
} as const;

/**
 * Indexing principles (bootstrap realized with ingest ADRs).
 */
export const INDEXING_PRINCIPLES = {
  uniqueEventIdForIdempotentIngest: true,
  occurredAtRequired: true,
  tenantTimeCompound: "{ merchantId: 1, occurredAt: -1 }",
  eventTypeTimeCompound: "{ eventType: 1, occurredAt: -1 }",
  sessionTimeCompound: "{ sessionId: 1, occurredAt: 1 }",
  auditActorTimeCompound: "{ actorId: 1, occurredAt: -1 }",
  detailAdr: "ADR-057",
} as const;

/**
 * Failure isolation — Mongo downtime must not block CompleteSale.
 * Buffer/retry/drop + metrics → ADR-065 (`src/analytics-ingest-isolation/`).
 */
export const FAILURE_ISOLATION = {
  onCheckoutCriticalPath: false,
  posMustSucceedWhenMongoDown: true,
  preferOutboxOrBuffer: true,
  detailAdr: "ADR-065",
  detailPackage: "src/analytics-ingest-isolation/",
  warehouseMirrorAdr: "ADR-057",
  warehouseMirrorPackage: "src/event-warehouse/",
  outboxConsumer: "mongodb_warehouse" as const,
  implemented: true,
} as const;

/**
 * Iranian First — telemetry payloads may hold Persian (fa) strings.
 * Event codes may stay English; human dashboard copy is Persian (ADR-014).
 */
export const UNICODE_PAYLOAD_SAFETY = {
  preserveUtf8PersianInPayloads: true,
  eventCodesMayStayEnglish: true,
  humanDashboardCopyPersian: true,
  merchantTimeBucketsJalaliTehran: true,
} as const;

/** Where Mongo access lives — contract + live adapters (ADR-110). */
export const PLACEMENT = {
  architectureContract: "src/mongodb-analytics/",
  clientStub: "src/infrastructure/mongodb/client.ts",
  runtimePackage: "src/infrastructure/mongodb/",
  techFolderConvention: "src/infrastructure/mongodb/",
  analyticsModulesLater: "src/modules/analytics/",
  auditModulesLater: "src/modules/audit/",
  auditPackage: "src/audit-logging/",
  warehouseAdr: "ADR-057",
  warehousePackage: "src/event-warehouse/",
  auditAdr: "ADR-058",
  productAnalyticsAdr: "ADR-059",
  productAnalyticsPackage: "src/product-analytics/",
  clickstreamAdr: "ADR-060",
  clickstreamPackage: "src/clickstream/",
  sessionAnalyticsAdr: "ADR-061",
  sessionAnalyticsPackage: "src/session-analytics/",
  /** Session aggregates — dedicated collection (ADR-061); path events stay mos_behavior. */
  sessionAnalyticsCollection: "mos_sessions",
  mgmtDashboardAdr: "ADR-062",
  mgmtDashboardPackage: "src/mgmt-dashboard-analytics/",
  /** Pre-aggregated management dashboards — locked `mos_mgmt` (ADR-062). */
  mgmtDashboardCollection: MONGO_COLLECTIONS.mgmt,
  retentionAdr: "ADR-064",
  retentionPackage: "src/data-retention/",
  failureIsolationAdr: "ADR-065",
  failureIsolationPackage: "src/analytics-ingest-isolation/",
  boundariesPackage: "src/analytics-boundaries/",
  runtimeAdr: "ADR-110",
} as const;

export const MONGO_REQUIREMENTS = {
  analyticsPlaneOnly: true,
  neverOltpSourceOfTruth: true,
  connectViaMongodbUrl: true,
  collectionNamingLocked: true,
  envelopeCanonical: true,
  tenantFiltersRequired: true,
  platformAdminGates: true,
  adaptersOnlyNoUiCredentials: true,
  /** ADR-110 lands official `mongodb` driver + adapters. */
  noProtocolDriverInThisAdr: false,
  protocolDriverImplementedAdr110: true,
  warehouseIngestDefer057: false,
  warehouseIngestImplemented057: true,
  failureIsolationDefer065: false,
  failureIsolationImplemented065: true,
  auditIngestDefer058: false,
  auditIngestImplemented058: true,
  productAnalyticsDefer059: false,
  productAnalyticsImplemented059: true,
  clickstreamDefer060: false,
  clickstreamImplemented060: true,
  sessionAnalyticsDefer061: false,
  sessionAnalyticsImplemented061: true,
  mgmtDashboardDefer062: false,
  mgmtDashboardImplemented062: true,
  retentionDefer064: false,
  retentionImplemented064: true,
  unicodePersianPayloadsSafe: true,
} as const;

export function assertMongoNeverOltpSot(planeRole: string): void {
  if (planeRole === "oltp_source_of_truth") {
    throw new Error(
      "MongoDB must never be the OLTP source of truth (ADR-056); PostgreSQL remains OLTP SoT.",
    );
  }
  if (!MONGO_ENGINE.neverOltpSourceOfTruth) {
    throw new Error(
      "MONGO_ENGINE.neverOltpSourceOfTruth must be true (ADR-056).",
    );
  }
  if (FORBIDDEN_MONGO.asOltpSourceOfTruth !== false) {
    throw new Error(
      "FORBIDDEN_MONGO.asOltpSourceOfTruth must remain false (ADR-056).",
    );
  }
  if (COMPOSE_DATA_PLANES.mongo.neverOltpSourceOfTruth !== true) {
    throw new Error(
      "Compose mongo plane must set neverOltpSourceOfTruth (ADR-056 / ADR-066).",
    );
  }
  if (PRODUCT_ARCHITECTURE.dataPlanes.analytics !== "mongodb") {
    throw new Error(
      `PRODUCT_ARCHITECTURE.dataPlanes.analytics must be "mongodb" (ADR-056); got "${PRODUCT_ARCHITECTURE.dataPlanes.analytics}".`,
    );
  }
}

export function assertMongoAnalyticsRole(role: string): void {
  if (role !== MONGO_ENGINE.role) {
    throw new Error(
      `Mongo role must be "${MONGO_ENGINE.role}" (ADR-056); got "${role}".`,
    );
  }
  if (COMPOSE_DATA_PLANES.mongo.role !== MONGO_ENGINE.role) {
    throw new Error(
      "Compose mongo plane role must match analytics_audit_telemetry_only (ADR-056 / ADR-066).",
    );
  }
}

export function assertMongodbUrlConnectionKey(envVar: string): void {
  if (envVar !== CONNECTION.envVar) {
    throw new Error(
      `Mongo connection env var must be "${CONNECTION.envVar}" (ADR-056); got "${envVar}".`,
    );
  }
}

export function assertKnownMongoCollection(name: string): asserts name is MongoCollectionName {
  const allowed = Object.values(MONGO_COLLECTIONS) as string[];
  if (!allowed.includes(name)) {
    throw new Error(
      `Unknown Mongo analytics collection "${name}" (ADR-056); expected one of ${allowed.join(", ")}.`,
    );
  }
}

export function assertMerchantScopedDocument(merchantId: string | null | undefined): void {
  if (merchantId === null || merchantId === undefined || merchantId === "") {
    throw new Error(
      "Merchant-scoped analytics documents must include merchantId (ADR-056).",
    );
  }
}

export function assertPlatformAnalyticsAudience(audience: string): void {
  if (audience !== TENANCY_AND_AUTHZ.platformAudience && audience !== "admin_only") {
    throw new Error(
      `Platform / management Mongo analytics must be platform_admin (ADR-056); got "${audience}".`,
    );
  }
}

export function assertFailureIsolationDeferred(detailAdr: string): void {
  if (detailAdr !== FAILURE_ISOLATION.detailAdr) {
    throw new Error(
      `Analytics ingest failure isolation detail is ADR-065; got "${detailAdr}".`,
    );
  }
  if (FAILURE_ISOLATION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "Mongo analytics must stay off checkout critical path (ADR-056).",
    );
  }
}

/** ADR-065 realized — package pointer + off-critical-path invariants. */
export function assertFailureIsolationImplemented(packagePath: string): void {
  if (packagePath !== FAILURE_ISOLATION.detailPackage) {
    throw new Error(
      `Analytics ingest failure isolation package is ${FAILURE_ISOLATION.detailPackage}; got "${packagePath}".`,
    );
  }
  if (FAILURE_ISOLATION.implemented !== true) {
    throw new Error(
      "FAILURE_ISOLATION.implemented must be true after ADR-065 (ADR-056).",
    );
  }
  if (MONGO_REQUIREMENTS.failureIsolationDefer065 !== false) {
    throw new Error(
      "failureIsolationDefer065 must be false after ADR-065 (ADR-056).",
    );
  }
  if (FAILURE_ISOLATION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "Mongo analytics must stay off checkout critical path (ADR-056).",
    );
  }
}

export function assertAlignsWithAnalyticsBoundaries(): void {
  if (!ANALYTICS_BOUNDARIES_DECISION.mongoNeverOltpSourceOfTruth) {
    throw new Error(
      "ANALYTICS_BOUNDARIES_DECISION.mongoNeverOltpSourceOfTruth must be true (ADR-056).",
    );
  }
  if (MONGO_ANALYTICS_PLANE.plane !== MONGO_ENGINE.plane) {
    throw new Error(
      `MONGO_ANALYTICS_PLANE.plane must be "${MONGO_ENGINE.plane}" (ADR-056).`,
    );
  }
  if (!MONGO_ANALYTICS_PLANE.neverOltpSourceOfTruth) {
    throw new Error(
      "MONGO_ANALYTICS_PLANE.neverOltpSourceOfTruth must be true (ADR-056).",
    );
  }
}

export const MONGODB_ANALYTICS = {
  engine: MONGO_ENGINE,
  forbidden: FORBIDDEN_MONGO,
  collections: MONGO_COLLECTIONS,
  collectionPurposes: MONGO_COLLECTION_PURPOSES,
  envelope: DOCUMENT_ENVELOPE,
  connection: CONNECTION,
  tenancyAndAuthz: TENANCY_AND_AUTHZ,
  indexing: INDEXING_PRINCIPLES,
  failureIsolation: FAILURE_ISOLATION,
  unicodePayloadSafety: UNICODE_PAYLOAD_SAFETY,
  placement: PLACEMENT,
  requirements: MONGO_REQUIREMENTS,
  alignsWith: {
    composeMongoPlane: COMPOSE_DATA_PLANES.mongo.plane,
    composeMongoRole: COMPOSE_DATA_PLANES.mongo.role,
    boundariesMongoPlane: MONGO_ANALYTICS_PLANE.plane,
    productAnalyticsPlane: PRODUCT_ARCHITECTURE.dataPlanes.analytics,
  },
} as const;
