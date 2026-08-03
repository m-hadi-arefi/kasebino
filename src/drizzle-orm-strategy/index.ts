/**
 * ADR-042 — Drizzle ORM Exclusive Strategy contract.
 *
 * Drizzle is the only SQL ORM. Schema/client live in infrastructure.
 * Domain and UI must never import drizzle-orm or schema tables.
 * Kit migration process: `src/migration-strategy` (ADR-046).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CONNECTION, DEFERRED_PLACEMENT } from "../postgresql-architecture/index.js";
import { DOMAIN_FORBIDDEN_IMPORTS, DDD_STRATEGY } from "../shared/ddd/index.js";

/** Exclusive approved SQL ORM. */
export const EXCLUSIVE_SQL_ORM = {
  name: "drizzle",
  packages: {
    runtime: "drizzle-orm",
    kit: "drizzle-kit",
    driver: "postgres",
  },
  dialect: "postgresql",
  parameterizedQueriesOnly: true,
} as const;

/**
 * Forbidden SQL ORMs / clients. Never add these to package.json or import them.
 * Package names checked in tests against package.json dependency maps.
 */
export const FORBIDDEN_SQL_ORMS = [
  "prisma",
  "@prisma/client",
  "typeorm",
  "sequelize",
  "@mikro-orm/core",
  "mikro-orm",
  "objection",
] as const;

export type ForbiddenSqlOrm = (typeof FORBIDDEN_SQL_ORMS)[number];

/** Canonical infrastructure placement (ADR-041 deferred → implemented stub here). */
export const DRIZZLE_PLACEMENT = {
  schema: "src/infrastructure/database/schema",
  schemaIndex: "src/infrastructure/database/schema/index.ts",
  client: "src/infrastructure/database/drizzle/client.ts",
  migrations: "src/infrastructure/database/migrations",
  config: "drizzle.config.ts",
  connectionEnvVar: CONNECTION.envVar,
} as const;

/**
 * Layering rules — repositories in infra; domain ports only.
 */
export const DRIZZLE_LAYERING = {
  domainMayImportDrizzle: false,
  uiMayImportDrizzle: false,
  repositoriesBelongInInfrastructure: true,
  domainImportsForbiddenPackage: "drizzle-orm",
  alignsWithDomainForbidden: DOMAIN_FORBIDDEN_IMPORTS.includes("drizzle-orm"),
  alignsWithDddOrm: DDD_STRATEGY.orm === "drizzle",
} as const;

/** npm scripts — generate/migrate via drizzle-kit (see ADR-046). */
export const DRIZZLE_SCRIPTS = {
  generate: "db:generate",
  migrate: "db:migrate",
  migrationsDetailAdr: "ADR-046",
} as const;

/**
 * Iranian First — Persian UTF-8 text at the column-type level.
 * Use text/varchar for product names, notes, addresses; never ASCII-only.
 */
export const IRANIAN_FIRST_TEXT_COLUMNS = {
  preferredTypes: ["text", "varchar"] as const,
  encoding: "UTF8",
  supportsPersianText: true,
  asciiOnlyCollationsForbidden: true,
} as const;

export const DRIZZLE_REQUIREMENTS = {
  exclusiveSqlOrm: true,
  forbiddenAlternateOrms: true,
  domainNeverImportsDrizzle: true,
  uiNeverImportsDrizzle: true,
  connectViaDatabaseUrl: true,
  migrationsViaDrizzleKit: true,
  migrationsDetailAdr: "ADR-046",
  noDomainTablesInThisAdr: true,
  utf8PersianTextColumns: true,
} as const;

export function assertExclusiveSqlOrm(ormName: string): void {
  if (ormName !== EXCLUSIVE_SQL_ORM.name) {
    throw new Error(
      `Exclusive SQL ORM must be "${EXCLUSIVE_SQL_ORM.name}" (ADR-042); got "${ormName}".`,
    );
  }
  if (DDD_STRATEGY.orm !== "drizzle") {
    throw new Error(
      `DDD_STRATEGY.orm must be "drizzle" (ADR-042); got "${DDD_STRATEGY.orm}".`,
    );
  }
}

export function assertForbiddenSqlOrmPackage(packageName: string): void {
  const normalized = packageName.toLowerCase();
  const isForbidden = (FORBIDDEN_SQL_ORMS as readonly string[]).some(
    (name) => normalized === name || normalized.startsWith(`${name}/`),
  );
  if (!isForbidden) {
    throw new Error(
      `"${packageName}" is not listed as a forbidden SQL ORM (ADR-042).`,
    );
  }
}

export function assertDomainMustNotImportDrizzle(
  mayImport: boolean = DRIZZLE_LAYERING.domainMayImportDrizzle,
): void {
  if (mayImport) {
    throw new Error(
      "Domain layer must never import drizzle-orm or schema tables (ADR-042).",
    );
  }
  if (!DOMAIN_FORBIDDEN_IMPORTS.includes("drizzle-orm")) {
    throw new Error(
      'DOMAIN_FORBIDDEN_IMPORTS must include "drizzle-orm" (ADR-042 / ADR-002).',
    );
  }
}

export function assertPackageJsonExclusiveDrizzle(
  packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  },
): void {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  if (!deps[EXCLUSIVE_SQL_ORM.packages.runtime]) {
    throw new Error(
      `package.json must depend on "${EXCLUSIVE_SQL_ORM.packages.runtime}" (ADR-042).`,
    );
  }
  if (!deps[EXCLUSIVE_SQL_ORM.packages.kit]) {
    throw new Error(
      `package.json must depend on "${EXCLUSIVE_SQL_ORM.packages.kit}" (ADR-042).`,
    );
  }
  if (!deps[EXCLUSIVE_SQL_ORM.packages.driver]) {
    throw new Error(
      `package.json must depend on "${EXCLUSIVE_SQL_ORM.packages.driver}" (ADR-042).`,
    );
  }
  for (const forbidden of FORBIDDEN_SQL_ORMS) {
    if (deps[forbidden]) {
      throw new Error(
        `Forbidden SQL ORM "${forbidden}" must not be in package.json (ADR-042).`,
      );
    }
  }
}

export function readRootPackageJson(
  root: string = process.cwd(),
): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
} {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
}

export const DRIZZLE_ORM_STRATEGY = {
  exclusiveOrm: EXCLUSIVE_SQL_ORM,
  forbiddenSqlOrms: FORBIDDEN_SQL_ORMS,
  placement: DRIZZLE_PLACEMENT,
  layering: DRIZZLE_LAYERING,
  scripts: DRIZZLE_SCRIPTS,
  iranianFirstTextColumns: IRANIAN_FIRST_TEXT_COLUMNS,
  requirements: DRIZZLE_REQUIREMENTS,
  alignsWith: {
    deferredPlacementOrm: DEFERRED_PLACEMENT.orm,
    deferredPlacementOrmAdr: DEFERRED_PLACEMENT.ormAdr,
    connectionEnvVar: CONNECTION.envVar,
    dddOrm: DDD_STRATEGY.orm,
  },
} as const;
