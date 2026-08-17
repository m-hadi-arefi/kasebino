import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANALYTICS_BOUNDARIES_DECISION,
  MONGO_ANALYTICS_PLANE,
} from "../boundaries/index.js";
import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_SERVICE_PORTS,
  extractComposeServiceNames,
} from "../../../../shared/contracts/docker-compose-parity/index.js";
import {
  createMongodbConfig,
  createMongodbConfigFromEnv,
} from "../../client.js";
import { PRODUCT_ARCHITECTURE } from "../../../../shared/architecture/product/index.js";
import {
  CONNECTION,
  DOCUMENT_ENVELOPE,
  DOCUMENT_ENVELOPE_FIELDS,
  FAILURE_ISOLATION,
  FORBIDDEN_MONGO,
  INDEXING_PRINCIPLES,
  MONGO_COLLECTIONS,
  MONGO_ENGINE,
  MONGO_REQUIREMENTS,
  MONGODB_ANALYTICS,
  PLACEMENT,
  TENANCY_AND_AUTHZ,
  UNICODE_PAYLOAD_SAFETY,
  assertAlignsWithAnalyticsBoundaries,
  assertFailureIsolationDeferred,
  assertFailureIsolationImplemented,
  assertKnownMongoCollection,
  assertMerchantScopedDocument,
  assertMongoAnalyticsRole,
  assertMongoNeverOltpSot,
  assertMongodbUrlConnectionKey,
  assertPlatformAnalyticsAudience,
} from "./index.js";

const root = process.cwd();

describe("ADR-056 MongoDB Analytics and Telemetry Plane", () => {
  it("locks Mongo as analytics-only plane (never OLTP SoT)", () => {
    expect(MONGO_ENGINE.name).toBe("mongodb");
    expect(MONGO_ENGINE.role).toBe("analytics_audit_telemetry_only");
    expect(MONGO_ENGINE.plane).toBe("mongodb_analytics");
    expect(MONGO_ENGINE.neverOltpSourceOfTruth).toBe(true);
    expect(MONGO_ENGINE.soleSourceOfTruth).toBe(false);
    expect(MONGO_REQUIREMENTS.analyticsPlaneOnly).toBe(true);
    expect(MONGO_REQUIREMENTS.neverOltpSourceOfTruth).toBe(true);

    expect(FORBIDDEN_MONGO.asOltpSourceOfTruth).toBe(false);
    expect(FORBIDDEN_MONGO.asMoneyStockSot).toBe(false);
    expect(FORBIDDEN_MONGO.asMembershipSot).toBe(false);
    expect(FORBIDDEN_MONGO.drizzleOrmOnMongo).toBe(false);
    expect(COMPOSE_DATA_PLANES.mongo.role).toBe(
      "analytics_audit_telemetry_only",
    );
    expect(MONGODB_ANALYTICS.alignsWith.composeMongoRole).toBe(
      COMPOSE_DATA_PLANES.mongo.role,
    );
    expect(PRODUCT_ARCHITECTURE.dataPlanes.analytics).toBe("mongodb");
    expect(PRODUCT_ARCHITECTURE.dataPlanes.oltp).toBe("postgresql");

    expect(() =>
      assertMongoAnalyticsRole("analytics_audit_telemetry_only"),
    ).not.toThrow();
    expect(() => assertMongoAnalyticsRole("oltp_source_of_truth")).toThrow(
      /analytics_audit_telemetry_only/i,
    );
    expect(() => assertMongoNeverOltpSot("analytics_only")).not.toThrow();
    expect(() => assertMongoNeverOltpSot("oltp_source_of_truth")).toThrow(
      /never be the OLTP source of truth/i,
    );
  });

  it("locks mos_* collection naming for analytics plane concerns", () => {
    expect(MONGO_COLLECTIONS).toEqual({
      events: "mos_events",
      audit: "mos_audit",
      product: "mos_product",
      behavior: "mos_behavior",
      security: "mos_security",
      mgmt: "mos_mgmt",
    });
    expect(MONGO_REQUIREMENTS.collectionNamingLocked).toBe(true);

    expect(() => assertKnownMongoCollection("mos_events")).not.toThrow();
    expect(() => assertKnownMongoCollection("mos_audit")).not.toThrow();
    expect(() => assertKnownMongoCollection("sales")).toThrow(/Unknown Mongo/i);
  });

  it("defines canonical document envelope with idempotent eventId", () => {
    expect(DOCUMENT_ENVELOPE.idempotencyKey).toBe("eventId");
    expect(DOCUMENT_ENVELOPE.schemaVersionStartsAt).toBe(1);
    expect(DOCUMENT_ENVELOPE.occurredAtStorage).toBe("utc_iso8601");
    expect(DOCUMENT_ENVELOPE_FIELDS).toEqual(
      expect.arrayContaining([
        "eventId",
        "eventType",
        "occurredAt",
        "merchantId",
        "correlationId",
        "schemaVersion",
        "payload",
      ]),
    );
    expect(INDEXING_PRINCIPLES.uniqueEventIdForIdempotentIngest).toBe(true);
    expect(MONGO_REQUIREMENTS.envelopeCanonical).toBe(true);
  });

  it("connects via MONGODB_URL documented in compose and .env.example", () => {
    expect(CONNECTION.envVar).toBe("MONGODB_URL");
    expect(CONNECTION.scheme).toBe("mongodb://");
    expect(MONGO_REQUIREMENTS.connectViaMongodbUrl).toBe(true);

    expect(() => assertMongodbUrlConnectionKey("MONGODB_URL")).not.toThrow();
    expect(() => assertMongodbUrlConnectionKey("MONGODB_URI")).toThrow(
      /MONGODB_URL/i,
    );

    const envPath = join(root, COMPOSE_FILES.envExample);
    expect(existsSync(envPath)).toBe(true);
    const env = readFileSync(envPath, "utf8");
    expect(env).toMatch(/^MONGODB_URL=/m);
    expect(env).toMatch(/mongodb:\/\//);
  });

  it("verifies compose ships mongo analytics plane with MONGODB_URL wiring", () => {
    const composePath = join(root, COMPOSE_FILES.compose);
    expect(existsSync(composePath)).toBe(true);
    const yaml = readFileSync(composePath, "utf8");
    const names = extractComposeServiceNames(yaml);

    expect(names).toContain("mongo");
    expect(yaml).toMatch(/^\s*mongo:\s*$/m);
    expect(yaml).toContain("MONGODB_URL");
    expect(yaml).toContain("mongo:7");
    expect(yaml).toContain("mongosh");
    expect(yaml).toContain("mongo_data");
    expect(yaml).toContain("merchantos_analytics");
    expect(COMPOSE_SERVICE_PORTS.mongo).toEqual([27017]);
    expect(COMPOSE_DATA_PLANES.mongo.plane).toBe("mongodb_analytics");
    expect(COMPOSE_DATA_PLANES.mongo.neverOltpSourceOfTruth).toBe(true);
    expect(MONGO_ENGINE.composePort).toBe(27017);
    expect(MONGO_ENGINE.defaultDatabase).toBe("merchantos_analytics");
  });

  it("requires tenant filters and platform_admin gates", () => {
    expect(TENANCY_AND_AUTHZ.merchantScopedMustIncludeMerchantId).toBe(true);
    expect(TENANCY_AND_AUTHZ.merchantQueriesMustFilterMerchantId).toBe(true);
    expect(TENANCY_AND_AUTHZ.platformAudience).toBe("platform_admin");
    expect(TENANCY_AND_AUTHZ.platformAccessMustBeAudited).toBe(true);
    expect(MONGO_REQUIREMENTS.tenantFiltersRequired).toBe(true);
    expect(MONGO_REQUIREMENTS.platformAdminGates).toBe(true);

    expect(() =>
      assertMerchantScopedDocument("merchant-1"),
    ).not.toThrow();
    expect(() => assertMerchantScopedDocument(null)).toThrow(/merchantId/i);
    expect(() =>
      assertPlatformAnalyticsAudience("platform_admin"),
    ).not.toThrow();
    expect(() => assertPlatformAnalyticsAudience("merchant_staff")).toThrow(
      /platform_admin/i,
    );
  });

  it("points failure isolation to ADR-065 package and keeps Mongo off checkout path", () => {
    expect(FAILURE_ISOLATION.onCheckoutCriticalPath).toBe(false);
    expect(FAILURE_ISOLATION.posMustSucceedWhenMongoDown).toBe(true);
    expect(FAILURE_ISOLATION.detailAdr).toBe("ADR-065");
    expect(FAILURE_ISOLATION.detailPackage).toBe(
      "src/infrastructure/mongodb/contracts/ingest-isolation/",
    );
    expect(FAILURE_ISOLATION.implemented).toBe(true);
    expect(FAILURE_ISOLATION.warehouseMirrorAdr).toBe("ADR-057");
    expect(FAILURE_ISOLATION.warehouseMirrorPackage).toBe(
      "src/events/contracts/event-warehouse/",
    );
    expect(MONGO_REQUIREMENTS.failureIsolationDefer065).toBe(false);
    expect(MONGO_REQUIREMENTS.failureIsolationImplemented065).toBe(true);
    expect(MONGO_REQUIREMENTS.warehouseIngestDefer057).toBe(false);
    expect(MONGO_REQUIREMENTS.warehouseIngestImplemented057).toBe(true);
    expect(MONGO_REQUIREMENTS.auditIngestDefer058).toBe(false);
    expect(MONGO_REQUIREMENTS.auditIngestImplemented058).toBe(true);
    expect(MONGO_REQUIREMENTS.productAnalyticsDefer059).toBe(false);
    expect(MONGO_REQUIREMENTS.productAnalyticsImplemented059).toBe(true);
    expect(MONGO_REQUIREMENTS.clickstreamDefer060).toBe(false);
    expect(MONGO_REQUIREMENTS.clickstreamImplemented060).toBe(true);
    expect(MONGO_REQUIREMENTS.sessionAnalyticsDefer061).toBe(false);
    expect(MONGO_REQUIREMENTS.sessionAnalyticsImplemented061).toBe(true);
    expect(MONGO_REQUIREMENTS.mgmtDashboardDefer062).toBe(false);
    expect(MONGO_REQUIREMENTS.mgmtDashboardImplemented062).toBe(true);
    expect(MONGO_REQUIREMENTS.retentionDefer064).toBe(false);
    expect(MONGO_REQUIREMENTS.retentionImplemented064).toBe(true);
    expect(PLACEMENT.warehousePackage).toBe("src/events/contracts/event-warehouse/");
    expect(PLACEMENT.auditPackage).toBe("src/infrastructure/security/contracts/audit-logging/");
    expect(PLACEMENT.productAnalyticsPackage).toBe("src/modules/analytics/domain/product/");
    expect(PLACEMENT.clickstreamPackage).toBe("src/infrastructure/mongodb/clickstream/");
    expect(PLACEMENT.sessionAnalyticsPackage).toBe("src/modules/analytics/domain/session/");
    expect(PLACEMENT.sessionAnalyticsCollection).toBe("mos_sessions");
    expect(PLACEMENT.mgmtDashboardPackage).toBe(
      "src/modules/admin/ui/analytics/",
    );
    expect(PLACEMENT.mgmtDashboardCollection).toBe("mos_mgmt");
    expect(PLACEMENT.retentionPackage).toBe("src/infrastructure/database/contracts/retention/");
    expect(PLACEMENT.retentionAdr).toBe("ADR-064");
    expect(PLACEMENT.failureIsolationPackage).toBe(
      "src/infrastructure/mongodb/contracts/ingest-isolation/",
    );

    expect(() => assertFailureIsolationDeferred("ADR-065")).not.toThrow();
    expect(() => assertFailureIsolationDeferred("ADR-056")).toThrow(
      /ADR-065/i,
    );
    expect(() =>
      assertFailureIsolationImplemented("src/infrastructure/mongodb/contracts/ingest-isolation/"),
    ).not.toThrow();
    expect(() => assertFailureIsolationImplemented("src/elsewhere/")).toThrow(
      /ingest-isolation/,
    );
  });

  it("aligns with analytics-boundaries dual-plane decision", () => {
    expect(ANALYTICS_BOUNDARIES_DECISION.productPlatformStore).toBe("mongodb");
    expect(ANALYTICS_BOUNDARIES_DECISION.mongoNeverOltpSourceOfTruth).toBe(
      true,
    );
    expect(MONGO_ANALYTICS_PLANE.plane).toBe("mongodb_analytics");
    expect(MONGO_ANALYTICS_PLANE.detailAdr).toBe("ADR-056");
    expect(PLACEMENT.boundariesPackage).toBe("src/infrastructure/mongodb/contracts/boundaries/");

    expect(() => assertAlignsWithAnalyticsBoundaries()).not.toThrow();
  });

  it("requires Unicode-safe Persian payloads; Jalali remains presentation", () => {
    expect(UNICODE_PAYLOAD_SAFETY.preserveUtf8PersianInPayloads).toBe(true);
    expect(UNICODE_PAYLOAD_SAFETY.eventCodesMayStayEnglish).toBe(true);
    expect(UNICODE_PAYLOAD_SAFETY.humanDashboardCopyPersian).toBe(true);
    expect(UNICODE_PAYLOAD_SAFETY.merchantTimeBucketsJalaliTehran).toBe(true);
    expect(DOCUMENT_ENVELOPE.merchantFacingTimeBuckets).toBe(
      "jalali_asia_tehran_presentation",
    );
    expect(MONGO_REQUIREMENTS.unicodePersianPayloadsSafe).toBe(true);
  });

  it("exposes Mongo client + runtime under infrastructure (ADR-110)", () => {
    expect(PLACEMENT.clientStub).toBe("src/infrastructure/mongodb/client.ts");
    expect(PLACEMENT.runtimePackage).toBe("src/infrastructure/mongodb/");
    expect(PLACEMENT.runtimeAdr).toBe("ADR-110");
    expect(MONGO_REQUIREMENTS.noProtocolDriverInThisAdr).toBe(false);
    expect(MONGO_REQUIREMENTS.protocolDriverImplementedAdr110).toBe(true);
    expect(MONGO_REQUIREMENTS.adaptersOnlyNoUiCredentials).toBe(true);

    const cfg = createMongodbConfig(
      "mongodb://merchantos:merchantos@localhost:27017/merchantos_analytics?authSource=admin",
    );
    expect(cfg.url).toContain("mongodb://");
    expect(cfg.envVar).toBe("MONGODB_URL");
    expect(cfg.databaseHint).toBe("merchantos_analytics");

    expect(
      createMongodbConfigFromEnv({
        MONGODB_URL:
          "mongodb+srv://user:pass@cluster.example/merchantos_analytics",
      }).url,
    ).toMatch(/^mongodb\+srv:\/\//);

    expect(() => createMongodbConfigFromEnv({})).toThrow(/MONGODB_URL/i);
    expect(() => createMongodbConfig("http://localhost:27017")).toThrow(
      /mongodb:\/\//i,
    );
  });
});
