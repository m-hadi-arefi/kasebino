import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CD_PROMOTION,
  CI_GATE_COMMANDS,
  CI_QUALITY_GATES,
  CI_WORKFLOW,
  CICD_REQUIREMENTS,
  CICD_STRATEGY,
  MIGRATION_REVIEW_GATE,
  NO_SECRETS_IN_LOGS,
  NO_SKIP_HOOKS,
  assertBuildGateInWorkflow,
  assertCdPromotionOrder,
  assertMigrationReviewRequired,
  assertNoSecretsEchoedInWorkflow,
  assertNoSkipHooks,
  assertValidateOnPullRequest,
  isCiQualityGate,
} from "./index.js";

const root = process.cwd();

function loadPackageScripts(): Record<string, string> {
  const pkg = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  return pkg.scripts ?? {};
}

describe("ADR-069 CI/CD Strategy", () => {
  it("locks quality gates: lint, typecheck, test, build, schema drift, migration review", () => {
    expect(CI_QUALITY_GATES).toEqual([
      "lint",
      "typecheck",
      "test",
      "build",
      "schema_drift_check",
      "migration_review",
    ]);
    expect(isCiQualityGate("build")).toBe(true);
    expect(isCiQualityGate("deploy")).toBe(false);
    expect(CI_GATE_COMMANDS.validateIncludes).toEqual([
      "typecheck",
      "lint",
      "test",
    ]);
    expect(CICD_REQUIREMENTS.lintTypeTestBuildGates).toBe(true);
    expect(CICD_STRATEGY.qualityGates).toEqual(CI_QUALITY_GATES);
  });

  it("requires migration review for Drizzle before traffic", () => {
    expect(MIGRATION_REVIEW_GATE.required).toBe(true);
    expect(MIGRATION_REVIEW_GATE.orm).toBe("drizzle");
    expect(MIGRATION_REVIEW_GATE.applyBeforeTraffic).toBe(true);
    expect(MIGRATION_REVIEW_GATE.applyOwnedByAdr).toBe("ADR-070");
    expect(MIGRATION_REVIEW_GATE.reviewFor).toContain("long_locks");
    expect(() => assertMigrationReviewRequired(true)).not.toThrow();
    expect(() => assertMigrationReviewRequired(false)).toThrow(/migration review/i);
    expect(CICD_REQUIREMENTS.migrationReviewGate).toBe(true);
  });

  it("promotes CD staging then production with approvals; no laptop deploys", () => {
    expect(CD_PROMOTION.order).toEqual(["staging", "production"]);
    expect(CD_PROMOTION.requireStagingBeforeProd).toBe(true);
    expect(CD_PROMOTION.requireApprovalForProduction).toBe(true);
    expect(CD_PROMOTION.requireApprovalForStaging).toBe(true);
    expect(CD_PROMOTION.noDeployFromLaptop).toBe(true);
    expect(CD_PROMOTION.deployWorkflowDeferredTo).toBe("ADR-070");
    expect(() => assertCdPromotionOrder(["staging", "production"])).not.toThrow();
    expect(() => assertCdPromotionOrder(["production", "staging"])).toThrow(
      /staging then production/i,
    );
    expect(CICD_REQUIREMENTS.cdStagingThenProdWithApprovals).toBe(true);
  });

  it("forbids skipping hooks and leaking secrets in logs", () => {
    expect(NO_SKIP_HOOKS.forbidContinueOnErrorForGates).toBe(true);
    expect(NO_SKIP_HOOKS.forbidSkipGitHooks).toBe(true);
    expect(NO_SKIP_HOOKS.forbidNoVerifyCommitsInCi).toBe(true);
    expect(NO_SKIP_HOOKS.localValidateMustMatchCi).toBe(true);
    expect(() => assertNoSkipHooks(NO_SKIP_HOOKS)).not.toThrow();
    expect(() =>
      assertNoSkipHooks({
        forbidContinueOnErrorForGates: false,
        forbidSkipGitHooks: true,
        forbidNoVerifyCommitsInCi: true,
      }),
    ).toThrow(/skipping/i);

    expect(NO_SECRETS_IN_LOGS.required).toBe(true);
    expect(NO_SECRETS_IN_LOGS.forbidEchoOf).toContain("AUTH_SECRET");
    expect(NO_SECRETS_IN_LOGS.forbidPrintenv).toBe(true);
    expect(CICD_REQUIREMENTS.noSecretsInLogs).toBe(true);
    expect(CICD_REQUIREMENTS.noSkipHooks).toBe(true);
  });

  it("ships GitHub Actions CI workflow running validate + build on PRs", () => {
    expect(CI_WORKFLOW.path).toBe(".github/workflows/ci.yml");
    expect(CI_WORKFLOW.nodeVersion).toBe("20");
    expect(CI_WORKFLOW.validateCommand).toBe("npm run validate");
    expect(CI_WORKFLOW.buildCommand).toBe("npm run build");

    const workflowPath = join(root, CI_WORKFLOW.path);
    expect(existsSync(workflowPath)).toBe(true);
    const yaml = readFileSync(workflowPath, "utf8");

    expect(yaml).toMatch(/pull_request\s*:/);
    expect(yaml).toContain("npm ci");
    expect(yaml).toContain("npm run validate");
    expect(yaml).toContain("npm run build");
    expect(yaml).toMatch(/node-version:\s*['"]?20['"]?/);

    expect(() => assertValidateOnPullRequest(yaml)).not.toThrow();
    expect(() => assertBuildGateInWorkflow(yaml)).not.toThrow();
    expect(() => assertNoSecretsEchoedInWorkflow(yaml)).not.toThrow();

    expect(() =>
      assertValidateOnPullRequest("on:\n  push:\njobs: {}\n"),
    ).toThrow(/pull_request/i);
    expect(() =>
      assertNoSecretsEchoedInWorkflow(`${yaml}\n      - run: echo $AUTH_SECRET\n`),
    ).toThrow(/AUTH_SECRET/i);
    expect(() =>
      assertNoSecretsEchoedInWorkflow(`${yaml}\n      - run: printenv\n`),
    ).toThrow(/printenv/i);

    expect(CICD_REQUIREMENTS.githubActionsCi).toBe(true);
    expect(CICD_REQUIREMENTS.validateOnPullRequest).toBe(true);
  });

  it("keeps package.json validate composite for lint/type/test; build separate", () => {
    const scripts = loadPackageScripts();
    expect(scripts.validate).toMatch(/typecheck/);
    expect(scripts.validate).toMatch(/lint/);
    expect(scripts.validate).toMatch(/test/);
    expect(scripts.build).toMatch(/next build|build/);
    expect(scripts.lint).toBeTruthy();
    expect(scripts.typecheck).toBeTruthy();
    expect(scripts.test).toMatch(/vitest/);
  });
});
