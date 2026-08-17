/**
 * ADR-046 — Migration Strategy (Drizzle Kit) contract.
 *
 * Versioned SQL for PostgreSQL OLTP via drizzle-kit only. Concrete domain DDL
 * lands when schema tables exist; soft-delete / audit integrity →
 * `src/infrastructure/database/contracts/data-integrity` (ADR-047).
 *
 * Normative prose: docs/tech/drizzle-orm.md (Migration Strategy),
 * docs/architecture/11-deployment-architecture.md
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DRIZZLE_PLACEMENT,
  DRIZZLE_SCRIPTS,
  IRANIAN_FIRST_TEXT_COLUMNS,
  readRootPackageJson,
} from "../drizzle-strategy/index.js";

/** Tool: Drizzle Kit is the exclusive migration generator/applier. */
export const MIGRATION_TOOL = {
  name: "drizzle-kit",
  package: "drizzle-kit",
  exclusive: true,
  generateCommand: "drizzle-kit generate",
  migrateCommand: "drizzle-kit migrate",
  forbidAutoMigrateOnBootProd: true,
  forbidHandAuthoredBaselineSql: true,
} as const;

/** Canonical paths — must match drizzle.config.ts and ADR-042 placement. */
export const MIGRATION_PATHS = {
  folder: DRIZZLE_PLACEMENT.migrations,
  schemaIndex: DRIZZLE_PLACEMENT.schemaIndex,
  config: DRIZZLE_PLACEMENT.config,
  dialect: "postgresql",
  connectionEnvVar: DRIZZLE_PLACEMENT.connectionEnvVar,
} as const;

/** npm scripts mapped to drizzle-kit (package.json). */
export const MIGRATION_SCRIPTS = {
  generate: DRIZZLE_SCRIPTS.generate,
  migrate: DRIZZLE_SCRIPTS.migrate,
  generateNpmValue: MIGRATION_TOOL.generateCommand,
  migrateNpmValue: MIGRATION_TOOL.migrateCommand,
} as const;

/**
 * Workflow: design → schema → generate → review → CI/staging → prod job
 * before traffic.
 */
export const MIGRATION_WORKFLOW = {
  steps: [
    "update_ard_database_design",
    "update_drizzle_schema",
    "npm_run_db_generate",
    "review_sql_locks_indexes_backfills",
    "apply_ci_staging_migrate_job",
    "apply_prod_migrate_job_before_traffic",
  ] as const,
  requireHumanOrAgentSqlReview: true,
  reviewChecklist: [
    "locks",
    "indexes",
    "not_null_backfills",
    "expand_contract",
    "persian_utf8_safety",
  ] as const,
} as const;

/** Production: forward-only versioned SQL; no destructive downs. */
export const FORWARD_ONLY = {
  productionForwardOnly: true,
  forbidDestructiveDownOnProd: true,
  versionedSqlRequired: true,
  reason: "reviewable_ddl",
} as const;

/**
 * Expand/contract for breaking schema changes (rename/type change/NOT NULL).
 * Never drop+recreate columns that hold Persian text in one step.
 */
export const EXPAND_CONTRACT = {
  requiredForBreakingChanges: true,
  expandThenContract: true,
  examples: [
    "add_nullable_column_backfill_then_set_not_null",
    "add_new_column_dual_write_then_drop_old",
    "create_new_index_concurrently_then_drop_redundant",
  ] as const,
  forbidSingleStepDestructiveRewrite: true,
} as const;

/**
 * Deploy order: migrate job completes before new app traffic.
 * Aligns with docs/architecture/11-deployment-architecture.md.
 */
export const DEPLOY_ORDER = {
  migrateJobBeforeTraffic: true,
  forbidSchemaChangeViaAppBoot: true,
  ciApplyStaging: true,
  deploymentDoc: "docs/architecture/11-deployment-architecture.md",
} as const;

/** Lock awareness during DDL review and large index work. */
export const LOCK_AWARENESS = {
  requiredOnReview: true,
  preferOnlineIndexBuildsWhenLarge: true,
  onlineIndexBuildsFutureEvolution: true,
  forbidLongAccessExclusiveWithoutPlan: true,
} as const;

/**
 * Iranian First — never lose Persian UTF-8 data in migrations.
 * No ASCII-only collations; no encoding downgrades.
 */
export const PERSIAN_DATA_SAFETY = {
  encoding: IRANIAN_FIRST_TEXT_COLUMNS.encoding,
  preferredColumnTypes: IRANIAN_FIRST_TEXT_COLUMNS.preferredTypes,
  supportsPersianText: IRANIAN_FIRST_TEXT_COLUMNS.supportsPersianText,
  asciiOnlyCollationsForbidden:
    IRANIAN_FIRST_TEXT_COLUMNS.asciiOnlyCollationsForbidden,
  neverLosePersianData: true,
  forbidEncodingDowngrade: true,
  forbidDestructiveTruncateOfFaText: true,
} as const;

export const MIGRATION_FORBIDDEN = {
  autoMigrateOnBootProd: true,
  handAuthoredBaselineOutsideKit: true,
  prismaMigrateOrOtherOrmMigrations: true,
  destructiveDownOnProd: true,
  skipSqlReview: true,
} as const;

export const MIGRATION_REQUIREMENTS = {
  drizzleKitOnly: true,
  versionedSqlInMigrationsFolder: true,
  forwardOnlyProduction: true,
  expandContractForBreaking: true,
  migrateJobBeforeTraffic: true,
  ciApplyStaging: true,
  lockAwarenessOnReview: true,
  noBaselineSqlOutsideDrizzleKit: true,
  neverLosePersianData: true,
  noAutoMigrateOnBootProd: true,
  alignsWithDrizzlePlacement:
    DRIZZLE_PLACEMENT.migrations === MIGRATION_PATHS.folder,
  strategyDocs: [
    "docs/tech/drizzle-orm.md",
    "docs/architecture/11-deployment-architecture.md",
  ] as const,
} as const;

export type MigrationEnvironment = "development" | "staging" | "production";

export function assertForwardOnlyProduction(
  env: MigrationEnvironment,
  allowsDestructiveDown: boolean,
): void {
  if (env === "production" && allowsDestructiveDown) {
    throw new Error(
      "Destructive down migrations are forbidden in production (ADR-046 forward-only).",
    );
  }
}

export function assertNoAutoMigrateOnBoot(
  env: MigrationEnvironment,
  migratesOnAppBoot: boolean,
): void {
  if (env === "production" && migratesOnAppBoot) {
    throw new Error(
      "Auto-migrate on application boot is forbidden in production (ADR-046).",
    );
  }
}

export function assertMigrateBeforeTraffic(migrateJobCompleted: boolean): void {
  if (!migrateJobCompleted) {
    throw new Error(
      "Migrate job must complete before routing traffic (ADR-046).",
    );
  }
}

export function assertExpandContractForBreakingChange(
  isBreaking: boolean,
  usesExpandContract: boolean,
): void {
  if (isBreaking && !usesExpandContract) {
    throw new Error(
      "Breaking schema changes require expand/contract (ADR-046).",
    );
  }
}

export function assertNoHandAuthoredBaseline(
  authoredOutsideDrizzleKit: boolean,
): void {
  if (authoredOutsideDrizzleKit) {
    throw new Error(
      "Baseline/versioned SQL must come from drizzle-kit only (ADR-046).",
    );
  }
}

export function assertPersianDataSafe(input: {
  encoding?: string;
  asciiOnlyCollation?: boolean;
  dropsFaTextWithoutExpandContract?: boolean;
}): void {
  const encoding = input.encoding ?? PERSIAN_DATA_SAFETY.encoding;
  if (encoding.toUpperCase() !== "UTF8" && encoding.toUpperCase() !== "UTF-8") {
    throw new Error(
      "Migrations must preserve UTF-8 for Persian OLTP text (ADR-046).",
    );
  }
  if (input.asciiOnlyCollation === true) {
    throw new Error(
      "ASCII-only collation changes are forbidden for Persian text (ADR-046).",
    );
  }
  if (input.dropsFaTextWithoutExpandContract === true) {
    throw new Error(
      "Must not drop/truncate Persian text without expand/contract (ADR-046).",
    );
  }
}

export function assertMigrationScripts(
  packageJson: {
    scripts?: Record<string, string>;
  } = readRootPackageJson(),
): void {
  const scripts = packageJson.scripts ?? {};
  const generate = scripts[MIGRATION_SCRIPTS.generate];
  const migrate = scripts[MIGRATION_SCRIPTS.migrate];
  if (generate !== MIGRATION_SCRIPTS.generateNpmValue) {
    throw new Error(
      `package.json script "${MIGRATION_SCRIPTS.generate}" must be "${MIGRATION_SCRIPTS.generateNpmValue}" (ADR-046).`,
    );
  }
  if (migrate !== MIGRATION_SCRIPTS.migrateNpmValue) {
    throw new Error(
      `package.json script "${MIGRATION_SCRIPTS.migrate}" must be "${MIGRATION_SCRIPTS.migrateNpmValue}" (ADR-046).`,
    );
  }
}

export function assertDrizzleConfigOutPath(
  configSource: string = readFileSync(
    join(process.cwd(), MIGRATION_PATHS.config),
    "utf8",
  ),
): void {
  const normalized = configSource.replace(/\\/g, "/");
  const expectedOut = MIGRATION_PATHS.folder.replace(/\\/g, "/");
  if (!normalized.includes(expectedOut)) {
    throw new Error(
      `drizzle.config.ts out path must be "${MIGRATION_PATHS.folder}" (ADR-046).`,
    );
  }
  if (!normalized.includes("postgresql")) {
    throw new Error("drizzle.config.ts dialect must be postgresql (ADR-046).");
  }
  if (!normalized.includes("src/infrastructure/database/schema")) {
    throw new Error(
      "drizzle.config.ts schema path must point at infrastructure schema (ADR-046).",
    );
  }
}

export const MIGRATION_STRATEGY = {
  tool: MIGRATION_TOOL,
  paths: MIGRATION_PATHS,
  scripts: MIGRATION_SCRIPTS,
  workflow: MIGRATION_WORKFLOW,
  forwardOnly: FORWARD_ONLY,
  expandContract: EXPAND_CONTRACT,
  deployOrder: DEPLOY_ORDER,
  lockAwareness: LOCK_AWARENESS,
  persianDataSafety: PERSIAN_DATA_SAFETY,
  forbidden: MIGRATION_FORBIDDEN,
  requirements: MIGRATION_REQUIREMENTS,
} as const;
