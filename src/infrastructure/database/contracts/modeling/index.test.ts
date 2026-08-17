import { describe, expect, it } from "vitest";

import { MODULE_BOUNDARY_RULES } from "../../../../shared/contracts/modular-monolith/index.js";
import {
  TENANT_ISOLATION_EXPECTATIONS,
  UNIVERSAL_COLUMN_EXPECTATIONS,
} from "../postgresql-architecture/index.js";
import { IRANIAN_FIRST_TEXT_COLUMNS } from "../drizzle-strategy/index.js";

import {
  AUDIT_TIMESTAMPS,
  CROSS_MODULE_JOINS,
  DATABASE_MODELING,
  DATABASE_MODELING_REQUIREMENTS,
  MONEY_COLUMNS,
  OPTIMISTIC_LOCK,
  PERSIAN_TEXT_COLUMNS,
  PRIMARY_KEY,
  SOFT_DELETE,
  TABLE_NAMING,
  TENANT_COLUMN,
  assertAuditTimestampsUtc,
  assertMerchantIdOnTenantTable,
  assertMoneyIntegerMinorUnits,
  assertNoCrossModuleDomainJoin,
  assertOptimisticVersionWhenConcurrent,
  assertSnakeCasePluralTableName,
  assertSoftDeleteColumnOptional,
  assertUtf8PersianTextColumn,
  assertUuidPrimaryKey,
} from "./index.js";

describe("ADR-043 Database Modeling Standards", () => {
  it("requires snake_case plural table names", () => {
    expect(TABLE_NAMING.style).toBe("snake_case");
    expect(TABLE_NAMING.tableNumber).toBe("plural");
    expect(TABLE_NAMING.columnStyle).toBe("snake_case");
    expect(DATABASE_MODELING_REQUIREMENTS.snakeCasePluralTables).toBe(true);

    expect(() => assertSnakeCasePluralTableName("sale_lines")).not.toThrow();
    expect(() => assertSnakeCasePluralTableName("stock_items")).not.toThrow();
    expect(() => assertSnakeCasePluralTableName("sales")).not.toThrow();
    expect(() => assertSnakeCasePluralTableName("SaleLines")).toThrow(
      /snake_case/i,
    );
    expect(() => assertSnakeCasePluralTableName("sale_line")).toThrow(/plural/i);
  });

  it("requires UUID primary keys", () => {
    expect(PRIMARY_KEY.sql).toBe("id");
    expect(PRIMARY_KEY.type).toBe("uuid");
    expect(PRIMARY_KEY.type).toBe(
      UNIVERSAL_COLUMN_EXPECTATIONS.primaryKey.type,
    );
    expect(DATABASE_MODELING_REQUIREMENTS.uuidPrimaryKeys).toBe(true);

    expect(() => assertUuidPrimaryKey("uuid")).not.toThrow();
    expect(() => assertUuidPrimaryKey("serial")).toThrow(/UUID/i);
  });

  it("requires created_at/updated_at timestamptz stored in UTC", () => {
    expect(AUDIT_TIMESTAMPS.createdAt.sql).toBe("created_at");
    expect(AUDIT_TIMESTAMPS.updatedAt.sql).toBe("updated_at");
    expect(AUDIT_TIMESTAMPS.createdAt.type).toBe("timestamptz");
    expect(AUDIT_TIMESTAMPS.updatedAt.type).toBe("timestamptz");
    expect(AUDIT_TIMESTAMPS.storageTimezone).toBe("UTC");
    expect(AUDIT_TIMESTAMPS.requiredOnEveryTable).toBe(true);
    expect(
      DATABASE_MODELING_REQUIREMENTS.createdAtUpdatedAtTimestamptzUtc,
    ).toBe(true);

    expect(() => assertAuditTimestampsUtc("UTC")).not.toThrow();
    expect(() => assertAuditTimestampsUtc("Asia/Tehran")).toThrow(/UTC/i);
  });

  it("defines optional soft-delete deleted_at standard", () => {
    expect(SOFT_DELETE.optional).toBe(true);
    expect(SOFT_DELETE.column.sql).toBe("deleted_at");
    expect(SOFT_DELETE.column.type).toBe("timestamptz");
    expect(SOFT_DELETE.column.nullable).toBe(true);
    expect(SOFT_DELETE.partialUniquesWhenSoftDelete).toBe(true);
    expect(DATABASE_MODELING_REQUIREMENTS.softDeleteDeletedAtOptional).toBe(
      true,
    );

    expect(() => assertSoftDeleteColumnOptional(false)).not.toThrow();
    expect(() => assertSoftDeleteColumnOptional(true)).not.toThrow();
  });

  it("requires merchant_id on tenant tables", () => {
    expect(TENANT_COLUMN.sql).toBe("merchant_id");
    expect(TENANT_COLUMN.app).toBe("merchantId");
    expect(TENANT_COLUMN.type).toBe("uuid");
    expect(TENANT_COLUMN.requiredOnTenantTables).toBe(true);
    expect(TENANT_COLUMN.sql).toBe(
      TENANT_ISOLATION_EXPECTATIONS.tenantColumn.sql,
    );
    expect(DATABASE_MODELING_REQUIREMENTS.merchantIdOnTenantTables).toBe(true);

    expect(() =>
      assertMerchantIdOnTenantTable(true, "merchant_id"),
    ).not.toThrow();
    expect(() => assertMerchantIdOnTenantTable(false, null)).not.toThrow();
    expect(() => assertMerchantIdOnTenantTable(true, null)).toThrow(
      /merchant_id/i,
    );
  });

  it("requires Persian UTF-8 text/varchar columns", () => {
    expect(PERSIAN_TEXT_COLUMNS.encoding).toBe("UTF8");
    expect(PERSIAN_TEXT_COLUMNS.supportsPersianText).toBe(true);
    expect(PERSIAN_TEXT_COLUMNS.asciiOnlyCollationsForbidden).toBe(true);
    expect(PERSIAN_TEXT_COLUMNS.preferredTypes).toEqual(
      IRANIAN_FIRST_TEXT_COLUMNS.preferredTypes,
    );
    expect(DATABASE_MODELING_REQUIREMENTS.utf8PersianTextColumns).toBe(true);

    expect(() => assertUtf8PersianTextColumn("UTF8", "text")).not.toThrow();
    expect(() => assertUtf8PersianTextColumn("UTF-8", "varchar")).not.toThrow();
    expect(() => assertUtf8PersianTextColumn("LATIN1", "text")).toThrow(
      /UTF-8/i,
    );
    expect(() => assertUtf8PersianTextColumn("UTF8", "char")).toThrow(
      /text\/varchar/i,
    );
  });

  it("requires money as integer minor units IRR", () => {
    expect(MONEY_COLUMNS.storage).toBe("integer_minor_units");
    expect(MONEY_COLUMNS.currency).toBe("IRR");
    expect(MONEY_COLUMNS.forbidFloatOrDouble).toBe(true);
    expect(MONEY_COLUMNS.nonNegativeCheck).toBe(true);
    expect(DATABASE_MODELING_REQUIREMENTS.moneyIntegerMinorUnitsIrr).toBe(true);

    expect(() =>
      assertMoneyIntegerMinorUnits("integer_minor_units", "IRR"),
    ).not.toThrow();
    expect(() => assertMoneyIntegerMinorUnits("numeric", "IRR")).toThrow(
      /integer minor units/i,
    );
    expect(() =>
      assertMoneyIntegerMinorUnits("integer_minor_units", "USD"),
    ).toThrow(/IRR/i);
  });

  it("forbids cross-module joins in domain (ADR-004)", () => {
    expect(CROSS_MODULE_JOINS.allowedInDomain).toBe(false);
    expect(CROSS_MODULE_JOINS.referenceAdr).toBe("ADR-004");
    expect(CROSS_MODULE_JOINS.alignsWithModuleBoundary).toBe(true);
    expect(MODULE_BOUNDARY_RULES.noCrossModuleDbJoinsInDomain).toBe(true);
    expect(DATABASE_MODELING_REQUIREMENTS.noCrossModuleJoinsInDomain).toBe(
      true,
    );

    expect(() =>
      assertNoCrossModuleDomainJoin("catalog", "catalog"),
    ).not.toThrow();
    expect(() => assertNoCrossModuleDomainJoin("catalog", "ordering")).toThrow(
      /cross-module/i,
    );
  });

  it("requires version optimistic lock when concurrent writers", () => {
    expect(OPTIMISTIC_LOCK.columnSql).toBe("version");
    expect(OPTIMISTIC_LOCK.when).toBe("concurrent_writers");
    expect(DATABASE_MODELING_REQUIREMENTS.optimisticVersionWhenConcurrent).toBe(
      true,
    );

    expect(() =>
      assertOptimisticVersionWhenConcurrent(true, true),
    ).not.toThrow();
    expect(() =>
      assertOptimisticVersionWhenConcurrent(false, false),
    ).not.toThrow();
    expect(() =>
      assertOptimisticVersionWhenConcurrent(true, false),
    ).toThrow(/version/i);
  });

  it("defers indexing and keeps this ADR contract-only (no domain tables)", () => {
    expect(DATABASE_MODELING_REQUIREMENTS.noDomainTablesInThisAdr).toBe(true);
    expect(DATABASE_MODELING_REQUIREMENTS.indexingDeferredAdr).toBe("ADR-044");
    expect(DATABASE_MODELING.practice.queryFirst).toBe(true);
    expect(DATABASE_MODELING.practice.aggregatesMapToTables).toBe(true);
    expect(DATABASE_MODELING.practice.guidelinesDoc).toBe(
      "docs/architecture/data-modeling-guidelines.md",
    );
  });
});
