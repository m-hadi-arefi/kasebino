/**
 * ADR-069 — CI/CD Strategy contract.
 *
 * CI quality gates on every PR: lint, typecheck, tests, build, plus Drizzle
 * migration review policy. CD promotes staging → production with approvals;
 * hooks must not be skipped; secrets must never appear in CI logs.
 * Deploy/rollout mechanics → ADR-070.
 *
 * Cross-ref: ADR-078 (`npm run validate`), ADR-067 (build/standalone image),
 * ADR-068 (secrets via env), docs/architecture/11-deployment-architecture.md
 */

/** GitHub Actions workflow that runs PR quality gates. */
export const CI_WORKFLOW = {
  path: ".github/workflows/ci.yml",
  name: "ci",
  platform: "github_actions",
  triggers: ["pull_request", "push"] as const,
  pushBranches: ["main"] as const,
  nodeVersion: "20",
  installCommand: "npm ci",
  /** Primary composite gate — same as local / ADR-078. */
  validateScript: "validate",
  validateCommand: "npm run validate",
  /** Separate build gate (kept out of local `validate` for speed). */
  buildScript: "build",
  buildCommand: "npm run build",
} as const;

/**
 * Ordered CI quality gates (ADR-069 Decision + release-gate doc).
 * Migration review is a mandatory checklist step before merge/deploy apply.
 */
export const CI_QUALITY_GATES = [
  "lint",
  "typecheck",
  "test",
  "build",
  "migration_review",
] as const;

export type CiQualityGate = (typeof CI_QUALITY_GATES)[number];

/**
 * Maps gate names to package.json scripts / process steps.
 * `validate` = typecheck + lint + test (ADR-078).
 */
export const CI_GATE_COMMANDS = {
  lint: "npm run lint",
  typecheck: "npm run typecheck",
  test: "npm run test",
  build: "npm run build",
  /** Composite used by the workflow for the three package scripts. */
  validateComposite: "npm run validate",
  validateIncludes: ["typecheck", "lint", "test"] as const,
  migrationReview: "manual_or_checklist_before_merge",
} as const;

/**
 * Drizzle migration review requirements (ARD-019 / drizzle-rules).
 * Enforce as process gate in CI commentary + merge policy; apply job → ADR-070.
 */
export const MIGRATION_REVIEW_GATE = {
  required: true,
  orm: "drizzle",
  forbidOtherSqlOrms: true,
  reviewFor: [
    "long_locks",
    "not_null_backfills",
    "index_build_strategy",
    "expand_contract",
    "tenant_scoped_safety",
  ] as const,
  applyBeforeTraffic: true,
  applyOwnedByAdr: "ADR-070",
  migrationsDir: "src/infrastructure/database/migrations",
} as const;

/**
 * CD promotion — staging then production with human approvals.
 * Workflow YAML for deploy is ADR-070; policy is binding now.
 */
export const CD_PROMOTION = {
  order: ["staging", "production"] as const,
  requireStagingBeforeProd: true,
  requireApprovalForProduction: true,
  requireApprovalForStaging: true,
  noDeployFromLaptop: true,
  noSkipApprovals: true,
  deployWorkflowDeferredTo: "ADR-070",
} as const;

/** Hooks and gate integrity — never bypass CI/CD or local validate. */
export const NO_SKIP_HOOKS = {
  forbidCiSkipLabels: true,
  forbidContinueOnErrorForGates: true,
  forbidSkipGitHooks: true,
  forbidNoVerifyCommitsInCi: true,
  localValidateMustMatchCi: true,
} as const;

/**
 * Secrets must never appear in CI logs (ADR-068).
 * Prefer GitHub masked secrets; never echo env secret values.
 */
export const NO_SECRETS_IN_LOGS = {
  required: true,
  forbidEchoOf: [
    "AUTH_SECRET",
    "DATABASE_URL",
    "REDIS_URL",
    "MONGODB_URL",
    "POSTGRES_PASSWORD",
    "JWT_SECRET",
    "SMS_API_KEY",
    "PSP_API_KEY",
  ] as const,
  forbidPrintenv: true,
  forbidUnmaskedSecretInterpolationInRun: true,
  useGithubMaskedSecrets: true,
} as const;

export const CICD_REQUIREMENTS = {
  githubActionsCi: true,
  validateOnPullRequest: true,
  lintTypeTestBuildGates: true,
  migrationReviewGate: true,
  cdStagingThenProdWithApprovals: true,
  noSkipHooks: true,
  noSecretsInLogs: true,
} as const;

export function isCiQualityGate(name: string): name is CiQualityGate {
  return (CI_QUALITY_GATES as readonly string[]).includes(name);
}

export function assertValidateOnPullRequest(workflowYaml: string): void {
  if (!/pull_request\s*:/.test(workflowYaml)) {
    throw new Error(
      "CI workflow must trigger on pull_request (ADR-069).",
    );
  }
  if (!workflowYaml.includes(CI_WORKFLOW.validateCommand)) {
    throw new Error(
      `CI workflow must run ${CI_WORKFLOW.validateCommand} (ADR-069 / ADR-078).`,
    );
  }
}

export function assertBuildGateInWorkflow(workflowYaml: string): void {
  if (!workflowYaml.includes(CI_WORKFLOW.buildCommand)) {
    throw new Error(
      `CI workflow must run ${CI_WORKFLOW.buildCommand} build gate (ADR-069).`,
    );
  }
}

export function assertNoSecretsEchoedInWorkflow(workflowYaml: string): void {
  if (/\bprintenv\b/i.test(workflowYaml)) {
    throw new Error("CI workflow must not run printenv (ADR-069 no secrets in logs).");
  }
  for (const key of NO_SECRETS_IN_LOGS.forbidEchoOf) {
    const echoPattern = new RegExp(
      String.raw`echo\s+.*\$\{\{\s*secrets\.${key}\s*\}\}`,
      "i",
    );
    const envEchoPattern = new RegExp(
      String.raw`echo\s+.*\$${key}\b`,
      "i",
    );
    if (echoPattern.test(workflowYaml) || envEchoPattern.test(workflowYaml)) {
      throw new Error(
        `CI workflow must not echo secret ${key} (ADR-069 / ADR-068).`,
      );
    }
  }
}

export function assertCdPromotionOrder(order: readonly string[]): void {
  if (order.length < 2 || order[0] !== "staging" || order[1] !== "production") {
    throw new Error(
      'CD must promote staging then production (ADR-069).',
    );
  }
}

export function assertNoSkipHooks(policy: {
  forbidContinueOnErrorForGates: boolean;
  forbidSkipGitHooks: boolean;
  forbidNoVerifyCommitsInCi: boolean;
}): void {
  if (
    !policy.forbidContinueOnErrorForGates ||
    !policy.forbidSkipGitHooks ||
    !policy.forbidNoVerifyCommitsInCi
  ) {
    throw new Error("CI/CD must forbid skipping quality hooks (ADR-069).");
  }
}

export function assertMigrationReviewRequired(required: boolean): void {
  if (!required) {
    throw new Error(
      "Drizzle migration review gate is required on CI/CD path (ADR-069).",
    );
  }
}

export const CICD_STRATEGY = {
  workflow: CI_WORKFLOW,
  qualityGates: CI_QUALITY_GATES,
  gateCommands: CI_GATE_COMMANDS,
  migrationReview: MIGRATION_REVIEW_GATE,
  cd: CD_PROMOTION,
  noSkipHooks: NO_SKIP_HOOKS,
  noSecretsInLogs: NO_SECRETS_IN_LOGS,
  requirements: CICD_REQUIREMENTS,
} as const;
