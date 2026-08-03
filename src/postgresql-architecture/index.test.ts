import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_ARCHITECTURE } from "../product-architecture/index.js";
import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  extractComposeServiceNames,
} from "../docker-compose-parity/index.js";
import {
  CONNECTION,
  DEFERRED_PLACEMENT,
  FORBIDDEN_OLTP,
  POSTGRESQL_ARCHITECTURE,
  POSTGRESQL_ENGINE,
  POSTGRESQL_REQUIREMENTS,
  TENANT_ISOLATION_EXPECTATIONS,
  UNIVERSAL_COLUMN_EXPECTATIONS,
  UTF8_PERSIAN_TEXT,
  assertDatabaseUrlConnectionKey,
  assertMerchantIdIsolation,
  assertMongoNeverOltpSot,
  assertPostgresqlSoleOltpSot,
  assertSoftDeleteExpectation,
  assertTimestampStorageUtc,
  assertUtf8PersianEncoding,
  assertUuidPrimaryKeyExpectation,
} from "./index.js";

const root = process.cwd();

describe("ADR-041 PostgreSQL Architecture", () => {
  it("locks PostgreSQL as the sole OLTP system of record", () => {
    expect(POSTGRESQL_ENGINE.name).toBe("postgresql");
    expect(POSTGRESQL_ENGINE.role).toBe("oltp_source_of_truth");
    expect(POSTGRESQL_ENGINE.soleOltpSourceOfTruth).toBe(true);
    expect(POSTGRESQL_ENGINE.channel).toBe("latest_stable");
    expect(PRODUCT_ARCHITECTURE.dataPlanes.oltp).toBe("postgresql");
    expect(POSTGRESQL_ARCHITECTURE.alignsWith.productOltp).toBe("postgresql");
    expect(POSTGRESQL_ARCHITECTURE.alignsWith.composePostgresRole).toBe(
      "oltp_source_of_truth",
    );
    expect(POSTGRESQL_REQUIREMENTS.soleOltpSot).toBe(true);
    expect(() => assertPostgresqlSoleOltpSot("postgresql")).not.toThrow();
    expect(() => assertPostgresqlSoleOltpSot("mongodb")).toThrow(/sole OLTP/i);
  });

  it("forbids MongoDB (and peers) as OLTP SoT", () => {
    expect(FORBIDDEN_OLTP.mongodbAsOltpSot).toBe(false);
    expect(COMPOSE_DATA_PLANES.mongo.neverOltpSourceOfTruth).toBe(true);
    expect(POSTGRESQL_REQUIREMENTS.mongoNeverOltpSot).toBe(true);
    expect(() =>
      assertMongoNeverOltpSot(COMPOSE_DATA_PLANES.mongo.role),
    ).not.toThrow();
    expect(() => assertMongoNeverOltpSot("oltp_source_of_truth")).toThrow(
      /OLTP/i,
    );
  });

  it("expects UUID PKs, UTC timestamptz, and soft deletes at a high level", () => {
    expect(UNIVERSAL_COLUMN_EXPECTATIONS.primaryKey.type).toBe("uuid");
    expect(UNIVERSAL_COLUMN_EXPECTATIONS.timestamps.storageTimezone).toBe("UTC");
    expect(UNIVERSAL_COLUMN_EXPECTATIONS.timestamps.displayTimezone).toBe(
      "Asia/Tehran",
    );
    expect(UNIVERSAL_COLUMN_EXPECTATIONS.timestamps.createdAt.sql).toBe(
      "created_at",
    );
    expect(UNIVERSAL_COLUMN_EXPECTATIONS.timestamps.updatedAt.sql).toBe(
      "updated_at",
    );
    expect(UNIVERSAL_COLUMN_EXPECTATIONS.softDelete.column.sql).toBe(
      "deleted_at",
    );
    expect(UNIVERSAL_COLUMN_EXPECTATIONS.softDelete.detailAdr).toBe("ADR-047");
    expect(POSTGRESQL_REQUIREMENTS.uuidPrimaryKeys).toBe(true);
    expect(POSTGRESQL_REQUIREMENTS.timestamptzAuditColumns).toBe(true);
    expect(POSTGRESQL_REQUIREMENTS.softDeleteWhereApplicable).toBe(true);

    expect(() => assertUuidPrimaryKeyExpectation("uuid")).not.toThrow();
    expect(() => assertUuidPrimaryKeyExpectation("serial")).toThrow(/UUID/i);
    expect(() => assertTimestampStorageUtc("UTC")).not.toThrow();
    expect(() => assertTimestampStorageUtc("Asia/Tehran")).toThrow(/UTC/i);
    expect(() => assertSoftDeleteExpectation(true)).not.toThrow();
    expect(() => assertSoftDeleteExpectation(false)).toThrow(/Soft delete/i);
  });

  it("expects merchant_id / merchantId tenant isolation", () => {
    expect(TENANT_ISOLATION_EXPECTATIONS.tenantColumn.sql).toBe("merchant_id");
    expect(TENANT_ISOLATION_EXPECTATIONS.tenantColumn.app).toBe("merchantId");
    expect(
      TENANT_ISOLATION_EXPECTATIONS.tenantColumn.requiredOnTenantTables,
    ).toBe(true);
    expect(TENANT_ISOLATION_EXPECTATIONS.uniqueConstraintsTenantScoped).toBe(
      true,
    );
    expect(TENANT_ISOLATION_EXPECTATIONS.detailAdr).toBe("ADR-048");
    expect(POSTGRESQL_REQUIREMENTS.merchantIdIsolation).toBe(true);
    expect(() => assertMerchantIdIsolation("merchant_id")).not.toThrow();
    expect(() => assertMerchantIdIsolation("tenant_id")).toThrow(/merchant_id/i);
  });

  it("requires UTF-8 encoding for Persian OLTP text", () => {
    expect(UTF8_PERSIAN_TEXT.encoding).toBe("UTF8");
    expect(UTF8_PERSIAN_TEXT.supportsPersianText).toBe(true);
    expect(UTF8_PERSIAN_TEXT.asciiOnlyCollationsForbidden).toBe(true);
    expect(POSTGRESQL_REQUIREMENTS.utf8PersianText).toBe(true);
    expect(() => assertUtf8PersianEncoding("UTF8")).not.toThrow();
    expect(() => assertUtf8PersianEncoding("SQL_ASCII")).toThrow(/UTF-8/i);
  });

  it("connects OLTP via DATABASE_URL documented in compose and .env.example", () => {
    expect(CONNECTION.envVar).toBe("DATABASE_URL");
    expect(CONNECTION.pool.strategy).toBe("one_pool_per_app_instance");
    expect(CONNECTION.pool.driverDeferredTo).toBe("ADR-042");
    expect(POSTGRESQL_REQUIREMENTS.connectViaDatabaseUrl).toBe(true);
    expect(POSTGRESQL_REQUIREMENTS.noDrizzleInThisAdr).toBe(true);
    expect(DEFERRED_PLACEMENT.orm).toBe("drizzle");
    expect(DEFERRED_PLACEMENT.ormAdr).toBe("ADR-042");

    expect(() => assertDatabaseUrlConnectionKey("DATABASE_URL")).not.toThrow();
    expect(() => assertDatabaseUrlConnectionKey("PG_URL")).toThrow(
      /DATABASE_URL/i,
    );

    const envPath = join(root, COMPOSE_FILES.envExample);
    expect(existsSync(envPath)).toBe(true);
    const env = readFileSync(envPath, "utf8");
    expect(env).toMatch(/^DATABASE_URL=/m);
    expect(env).toMatch(/postgres:\/\//);
  });

  it("verifies compose ships a postgres OLTP service with DATABASE_URL wiring", () => {
    const composePath = join(root, COMPOSE_FILES.compose);
    expect(existsSync(composePath)).toBe(true);
    const yaml = readFileSync(composePath, "utf8");
    const names = extractComposeServiceNames(yaml);
    expect(names).toContain("postgres");
    expect(yaml).toMatch(/^\s*postgres:\s*$/m);
    expect(yaml).toContain("DATABASE_URL");
    expect(yaml).toContain("POSTGRES_INITDB_ARGS");
    expect(yaml).toContain("--encoding=UTF8");
    expect(COMPOSE_DATA_PLANES.postgres.plane).toBe("postgresql_oltp");
  });
});
