import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DOMAIN_FORBIDDEN_IMPORTS, DDD_STRATEGY } from "../shared/ddd/index.js";
import { DEFERRED_PLACEMENT } from "../postgresql-architecture/index.js";

import {
  DRIZZLE_LAYERING,
  DRIZZLE_ORM_STRATEGY,
  DRIZZLE_PLACEMENT,
  DRIZZLE_REQUIREMENTS,
  DRIZZLE_SCRIPTS,
  EXCLUSIVE_SQL_ORM,
  FORBIDDEN_SQL_ORMS,
  IRANIAN_FIRST_TEXT_COLUMNS,
  assertDomainMustNotImportDrizzle,
  assertExclusiveSqlOrm,
  assertForbiddenSqlOrmPackage,
  assertPackageJsonExclusiveDrizzle,
  readRootPackageJson,
} from "./index.js";

const root = process.cwd();

describe("ADR-042 Drizzle ORM Exclusive Strategy", () => {
  it("locks Drizzle as the exclusive SQL ORM", () => {
    expect(EXCLUSIVE_SQL_ORM.name).toBe("drizzle");
    expect(EXCLUSIVE_SQL_ORM.packages.runtime).toBe("drizzle-orm");
    expect(EXCLUSIVE_SQL_ORM.packages.kit).toBe("drizzle-kit");
    expect(EXCLUSIVE_SQL_ORM.packages.driver).toBe("postgres");
    expect(EXCLUSIVE_SQL_ORM.dialect).toBe("postgresql");
    expect(DDD_STRATEGY.orm).toBe("drizzle");
    expect(DEFERRED_PLACEMENT.orm).toBe("drizzle");
    expect(DRIZZLE_ORM_STRATEGY.alignsWith.deferredPlacementOrmAdr).toBe(
      "ADR-042",
    );
    expect(DRIZZLE_REQUIREMENTS.exclusiveSqlOrm).toBe(true);

    expect(() => assertExclusiveSqlOrm("drizzle")).not.toThrow();
    expect(() => assertExclusiveSqlOrm("prisma")).toThrow(/Exclusive SQL ORM/i);
  });

  it("forbids Prisma, TypeORM, Sequelize, MikroORM, and Objection", () => {
    expect(FORBIDDEN_SQL_ORMS).toEqual(
      expect.arrayContaining([
        "prisma",
        "@prisma/client",
        "typeorm",
        "sequelize",
        "@mikro-orm/core",
        "mikro-orm",
        "objection",
      ]),
    );
    expect(DRIZZLE_REQUIREMENTS.forbiddenAlternateOrms).toBe(true);

    for (const pkg of FORBIDDEN_SQL_ORMS) {
      expect(() => assertForbiddenSqlOrmPackage(pkg)).not.toThrow();
    }
    expect(() => assertForbiddenSqlOrmPackage("drizzle-orm")).toThrow(
      /not listed as a forbidden/i,
    );
  });

  it("requires domain (and UI) to never import Drizzle", () => {
    expect(DRIZZLE_LAYERING.domainMayImportDrizzle).toBe(false);
    expect(DRIZZLE_LAYERING.uiMayImportDrizzle).toBe(false);
    expect(DOMAIN_FORBIDDEN_IMPORTS).toContain("drizzle-orm");
    expect(DRIZZLE_LAYERING.alignsWithDomainForbidden).toBe(true);
    expect(DRIZZLE_REQUIREMENTS.domainNeverImportsDrizzle).toBe(true);

    expect(() => assertDomainMustNotImportDrizzle(false)).not.toThrow();
    expect(() => assertDomainMustNotImportDrizzle(true)).toThrow(
      /never import drizzle/i,
    );
  });

  it("declares infrastructure placement; domain tables land via domain ADRs", () => {
    expect(DRIZZLE_PLACEMENT.schema).toBe(
      "src/infrastructure/database/schema",
    );
    expect(DRIZZLE_PLACEMENT.client).toBe(
      "src/infrastructure/database/drizzle/client.ts",
    );
    expect(DRIZZLE_PLACEMENT.config).toBe("drizzle.config.ts");
    expect(DRIZZLE_PLACEMENT.connectionEnvVar).toBe("DATABASE_URL");
    /** Historical ADR-042 stance — domain tables arrive in later domain ADRs. */
    expect(DRIZZLE_REQUIREMENTS.noDomainTablesInThisAdr).toBe(true);

    expect(existsSync(join(root, DRIZZLE_PLACEMENT.schemaIndex))).toBe(true);
    expect(existsSync(join(root, DRIZZLE_PLACEMENT.client))).toBe(true);
    expect(existsSync(join(root, DRIZZLE_PLACEMENT.config))).toBe(true);

    const schema = readFileSync(
      join(root, DRIZZLE_PLACEMENT.schemaIndex),
      "utf8",
    );
    expect(schema.toLowerCase()).toMatch(/iranian first|utf-8|persian/i);
    // ADR-005..012 domain stubs: merchants/stores/memberships/catalog/inventory/sales/loyalty/orders/payments.
    expect(schema).toMatch(/merchants/);
    expect(schema).toMatch(/stores/);
    expect(schema).toMatch(/storeMemberships|store_memberships/);
    expect(schema).toMatch(/categories/);
    expect(schema).toMatch(/products/);
    expect(schema).toMatch(/stockItems|stock_items/);
    expect(schema).toMatch(/sales/);
    expect(schema).toMatch(/saleLines|sale_lines/);
    expect(schema).toMatch(/pointRules|point_rules/);
    expect(schema).toMatch(/wallets/);
    expect(schema).toMatch(/pointsLedger|points_ledger/);
    expect(schema).toMatch(/coupons/);
    expect(schema).toMatch(/orders/);
    expect(schema).toMatch(/orderLines|order_lines/);
    expect(schema).toMatch(/payments/);
    expect(existsSync(join(root, "src/infrastructure/database/schema/merchants.ts"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src/infrastructure/database/schema/stores.ts"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src/infrastructure/database/schema/memberships.ts"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src/infrastructure/database/schema/catalog.ts"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src/infrastructure/database/schema/inventory.ts"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src/infrastructure/database/schema/sales.ts"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src/infrastructure/database/schema/loyalty.ts"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src/infrastructure/database/schema/orders.ts"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src/infrastructure/database/schema/payments.ts"))).toBe(
      true,
    );

    const config = readFileSync(join(root, DRIZZLE_PLACEMENT.config), "utf8");
    expect(config).toContain("DATABASE_URL");
    expect(config).toContain("postgresql");
    expect(config).toContain(DRIZZLE_PLACEMENT.schema);
  });

  it("requires drizzle-orm + postgres + drizzle-kit and no forbidden ORMs in package.json", () => {
    const pkg = readRootPackageJson(root);
    expect(() => assertPackageJsonExclusiveDrizzle(pkg)).not.toThrow();
    expect(pkg.dependencies?.["drizzle-orm"]).toBeDefined();
    expect(pkg.dependencies?.postgres).toBeDefined();
    expect(pkg.devDependencies?.["drizzle-kit"]).toBeDefined();
  });

  it("exposes db:generate and db:migrate scripts (migrate detail ADR-046)", () => {
    const pkg = readRootPackageJson(root);
    expect(DRIZZLE_SCRIPTS.generate).toBe("db:generate");
    expect(DRIZZLE_SCRIPTS.migrate).toBe("db:migrate");
    expect(DRIZZLE_SCRIPTS.migrationsDetailAdr).toBe("ADR-046");
    expect(DRIZZLE_REQUIREMENTS.migrationsDetailAdr).toBe("ADR-046");
    expect(pkg.scripts?.[DRIZZLE_SCRIPTS.generate]).toBeDefined();
    expect(pkg.scripts?.[DRIZZLE_SCRIPTS.migrate]).toBeDefined();
  });

  it("notes Iranian First UTF-8 text/varchar columns for Persian OLTP text", () => {
    expect(IRANIAN_FIRST_TEXT_COLUMNS.preferredTypes).toEqual(
      expect.arrayContaining(["text", "varchar"]),
    );
    expect(IRANIAN_FIRST_TEXT_COLUMNS.encoding).toBe("UTF8");
    expect(IRANIAN_FIRST_TEXT_COLUMNS.supportsPersianText).toBe(true);
    expect(IRANIAN_FIRST_TEXT_COLUMNS.asciiOnlyCollationsForbidden).toBe(true);
    expect(DRIZZLE_REQUIREMENTS.utf8PersianTextColumns).toBe(true);
  });
});
