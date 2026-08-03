import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DRIZZLE_PLACEMENT,
  DRIZZLE_SCRIPTS,
  IRANIAN_FIRST_TEXT_COLUMNS,
  readRootPackageJson,
} from "../drizzle-orm-strategy/index.js";

import {
  DEPLOY_ORDER,
  EXPAND_CONTRACT,
  FORWARD_ONLY,
  LOCK_AWARENESS,
  MIGRATION_FORBIDDEN,
  MIGRATION_PATHS,
  MIGRATION_REQUIREMENTS,
  MIGRATION_SCRIPTS,
  MIGRATION_STRATEGY,
  MIGRATION_TOOL,
  MIGRATION_WORKFLOW,
  PERSIAN_DATA_SAFETY,
  assertDrizzleConfigOutPath,
  assertExpandContractForBreakingChange,
  assertForwardOnlyProduction,
  assertMigrateBeforeTraffic,
  assertMigrationScripts,
  assertNoAutoMigrateOnBoot,
  assertNoHandAuthoredBaseline,
  assertPersianDataSafe,
} from "./index.js";

const root = process.cwd();

describe("ADR-046 Migration Strategy Drizzle Kit", () => {
  it("locks drizzle-kit as the exclusive migration tool", () => {
    expect(MIGRATION_TOOL.name).toBe("drizzle-kit");
    expect(MIGRATION_TOOL.package).toBe("drizzle-kit");
    expect(MIGRATION_TOOL.exclusive).toBe(true);
    expect(MIGRATION_TOOL.generateCommand).toBe("drizzle-kit generate");
    expect(MIGRATION_TOOL.migrateCommand).toBe("drizzle-kit migrate");
    expect(MIGRATION_TOOL.forbidAutoMigrateOnBootProd).toBe(true);
    expect(MIGRATION_TOOL.forbidHandAuthoredBaselineSql).toBe(true);
    expect(MIGRATION_REQUIREMENTS.drizzleKitOnly).toBe(true);
    expect(MIGRATION_REQUIREMENTS.noAutoMigrateOnBootProd).toBe(true);
    expect(MIGRATION_REQUIREMENTS.noBaselineSqlOutsideDrizzleKit).toBe(true);
    expect(MIGRATION_FORBIDDEN.autoMigrateOnBootProd).toBe(true);
    expect(MIGRATION_FORBIDDEN.handAuthoredBaselineOutsideKit).toBe(true);
  });

  it("uses infrastructure migrations folder matching ADR-042 and drizzle.config", () => {
    expect(MIGRATION_PATHS.folder).toBe(DRIZZLE_PLACEMENT.migrations);
    expect(MIGRATION_PATHS.folder).toBe(
      "src/infrastructure/database/migrations",
    );
    expect(MIGRATION_PATHS.config).toBe("drizzle.config.ts");
    expect(MIGRATION_PATHS.dialect).toBe("postgresql");
    expect(MIGRATION_PATHS.connectionEnvVar).toBe("DATABASE_URL");
    expect(MIGRATION_REQUIREMENTS.alignsWithDrizzlePlacement).toBe(true);
    expect(MIGRATION_REQUIREMENTS.versionedSqlInMigrationsFolder).toBe(true);

    expect(existsSync(join(root, MIGRATION_PATHS.folder))).toBe(true);
    expect(existsSync(join(root, MIGRATION_PATHS.config))).toBe(true);

    const config = readFileSync(join(root, MIGRATION_PATHS.config), "utf8");
    expect(() => assertDrizzleConfigOutPath(config)).not.toThrow();
    expect(config).toContain(MIGRATION_PATHS.folder);
    expect(config).toContain("postgresql");
    expect(config.toLowerCase()).toMatch(/adr-046|migration/);
  });

  it("requires db:generate and db:migrate scripts wired to drizzle-kit", () => {
    expect(MIGRATION_SCRIPTS.generate).toBe(DRIZZLE_SCRIPTS.generate);
    expect(MIGRATION_SCRIPTS.migrate).toBe(DRIZZLE_SCRIPTS.migrate);
    expect(MIGRATION_SCRIPTS.generateNpmValue).toBe("drizzle-kit generate");
    expect(MIGRATION_SCRIPTS.migrateNpmValue).toBe("drizzle-kit migrate");

    const pkg = readRootPackageJson(root);
    expect(() => assertMigrationScripts(pkg)).not.toThrow();
    expect(pkg.scripts?.[MIGRATION_SCRIPTS.generate]).toBe(
      MIGRATION_SCRIPTS.generateNpmValue,
    );
    expect(pkg.scripts?.[MIGRATION_SCRIPTS.migrate]).toBe(
      MIGRATION_SCRIPTS.migrateNpmValue,
    );

    expect(() =>
      assertMigrationScripts({
        scripts: {
          "db:generate": "something-else",
          "db:migrate": "drizzle-kit migrate",
        },
      }),
    ).toThrow(/db:generate/);
  });

  it("encodes forward-only production and migrate-before-traffic deploy order", () => {
    expect(FORWARD_ONLY.productionForwardOnly).toBe(true);
    expect(FORWARD_ONLY.forbidDestructiveDownOnProd).toBe(true);
    expect(FORWARD_ONLY.versionedSqlRequired).toBe(true);
    expect(DEPLOY_ORDER.migrateJobBeforeTraffic).toBe(true);
    expect(DEPLOY_ORDER.ciApplyStaging).toBe(true);
    expect(DEPLOY_ORDER.forbidSchemaChangeViaAppBoot).toBe(true);
    expect(MIGRATION_REQUIREMENTS.forwardOnlyProduction).toBe(true);
    expect(MIGRATION_REQUIREMENTS.migrateJobBeforeTraffic).toBe(true);
    expect(MIGRATION_REQUIREMENTS.ciApplyStaging).toBe(true);

    expect(() => assertForwardOnlyProduction("production", false)).not.toThrow();
    expect(() => assertForwardOnlyProduction("production", true)).toThrow(
      /forward-only/i,
    );
    expect(() => assertForwardOnlyProduction("development", true)).not.toThrow();

    expect(() => assertNoAutoMigrateOnBoot("production", false)).not.toThrow();
    expect(() => assertNoAutoMigrateOnBoot("production", true)).toThrow(
      /boot/i,
    );

    expect(() => assertMigrateBeforeTraffic(true)).not.toThrow();
    expect(() => assertMigrateBeforeTraffic(false)).toThrow(/before routing/i);
  });

  it("requires expand/contract for breaking changes and lock-aware review", () => {
    expect(EXPAND_CONTRACT.requiredForBreakingChanges).toBe(true);
    expect(EXPAND_CONTRACT.expandThenContract).toBe(true);
    expect(EXPAND_CONTRACT.forbidSingleStepDestructiveRewrite).toBe(true);
    expect(LOCK_AWARENESS.requiredOnReview).toBe(true);
    expect(LOCK_AWARENESS.preferOnlineIndexBuildsWhenLarge).toBe(true);
    expect(MIGRATION_REQUIREMENTS.expandContractForBreaking).toBe(true);
    expect(MIGRATION_REQUIREMENTS.lockAwarenessOnReview).toBe(true);
    expect(MIGRATION_WORKFLOW.requireHumanOrAgentSqlReview).toBe(true);
    expect(MIGRATION_WORKFLOW.reviewChecklist).toEqual(
      expect.arrayContaining([
        "locks",
        "indexes",
        "not_null_backfills",
        "expand_contract",
        "persian_utf8_safety",
      ]),
    );

    expect(() =>
      assertExpandContractForBreakingChange(true, true),
    ).not.toThrow();
    expect(() =>
      assertExpandContractForBreakingChange(true, false),
    ).toThrow(/expand\/contract/i);
    expect(() =>
      assertExpandContractForBreakingChange(false, false),
    ).not.toThrow();
  });

  it("forbids hand-authored baseline SQL outside drizzle-kit", () => {
    expect(() => assertNoHandAuthoredBaseline(false)).not.toThrow();
    expect(() => assertNoHandAuthoredBaseline(true)).toThrow(/drizzle-kit/i);
  });

  it("never loses Persian UTF-8 data and forbids ASCII-only collations", () => {
    expect(PERSIAN_DATA_SAFETY.encoding).toBe(
      IRANIAN_FIRST_TEXT_COLUMNS.encoding,
    );
    expect(PERSIAN_DATA_SAFETY.neverLosePersianData).toBe(true);
    expect(PERSIAN_DATA_SAFETY.asciiOnlyCollationsForbidden).toBe(true);
    expect(PERSIAN_DATA_SAFETY.forbidEncodingDowngrade).toBe(true);
    expect(MIGRATION_REQUIREMENTS.neverLosePersianData).toBe(true);

    expect(() => assertPersianDataSafe({})).not.toThrow();
    expect(() => assertPersianDataSafe({ encoding: "UTF8" })).not.toThrow();
    expect(() => assertPersianDataSafe({ encoding: "LATIN1" })).toThrow(
      /UTF-8/i,
    );
    expect(() =>
      assertPersianDataSafe({ asciiOnlyCollation: true }),
    ).toThrow(/ASCII-only/i);
    expect(() =>
      assertPersianDataSafe({ dropsFaTextWithoutExpandContract: true }),
    ).toThrow(/Persian text/i);
  });

  it("documents the migration workflow and aggregates the strategy", () => {
    expect(MIGRATION_WORKFLOW.steps).toEqual(
      expect.arrayContaining([
        "update_drizzle_schema",
        "npm_run_db_generate",
        "review_sql_locks_indexes_backfills",
        "apply_ci_staging_migrate_job",
        "apply_prod_migrate_job_before_traffic",
      ]),
    );
    expect(MIGRATION_STRATEGY.tool).toBe(MIGRATION_TOOL);
    expect(MIGRATION_STRATEGY.paths).toBe(MIGRATION_PATHS);
    expect(MIGRATION_STRATEGY.requirements).toBe(MIGRATION_REQUIREMENTS);
  });
});
