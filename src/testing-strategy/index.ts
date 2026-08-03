/**
 * ADR-078 — Testing Strategy contract.
 *
 * Pyramid: many domain unit → fewer use-case/DB integration → few e2e journeys;
 * Vitest for unit; tenant isolation tests mandatory when data touched; AuthZ
 * when auth touched; Persian/RTL/Jalali/تومان regression notes; CI validate gate.
 * Layer tooling depth (Testcontainers, Playwright harnesses) → ADR-079.
 *
 * Normative prose: docs/testing/strategy.md, docs/rules/testing-rules.md,
 * docs/testing/test-pyramid.md
 */

/** Normative strategy documents. */
export const TESTING_STRATEGY_DOC = "docs/testing/strategy.md" as const;
export const TESTING_RULES_DOC = "docs/rules/testing-rules.md" as const;
export const TEST_PYRAMID_DOC = "docs/testing/test-pyramid.md" as const;

/**
 * Classic test pyramid — volume decreases toward the top.
 * Unit tests own domain invariants; integration wraps use cases + DB;
 * e2e covers critical auth/POS/pickup journeys only.
 */
export const TEST_PYRAMID = {
  order: ["unit", "integration", "e2e"] as const,
  relativeVolume: {
    unit: "many",
    integration: "fewer",
    e2e: "few",
  } as const,
  unit: {
    scope: "domain_invariants_policies_without_db",
    runner: "vitest",
    rejectedRunnersForUnitDefault: ["only_e2e"] as const,
  },
  integration: {
    scope: "use_cases_plus_db_redis_outbox_cache",
    toolsIntended: ["testcontainers", "compose"] as const,
    wiringDeferredTo: "ADR-079",
  },
  e2e: {
    scope: "critical_journeys_auth_pos_storefront_pickup",
    toolsIntended: ["playwright"] as const,
    mobileViewportsRequired: true,
    wiringDeferredTo: "ADR-079",
    forbidDeliveryJourneysInMvp: true,
  },
  perfSmoke: {
    scope: "barcode_checkout_budgets",
    toolsIntended: ["custom_timing_harness"] as const,
    whenTouched: ["pos", "barcode", "storefront_checkout"] as const,
    wiringDeferredTo: "ADR-079",
  },
  a11y: {
    scope: "primary_screens",
    toolsIntended: ["axe", "lighthouse"] as const,
    whenTouched: ["ui_primary_shells"] as const,
  },
  rejectedAlternatives: ["only_e2e", "manual_only"] as const,
} as const;

export type TestPyramidLayer = (typeof TEST_PYRAMID.order)[number];

/** Unit runner — Vitest selected; Jest remains a documented alternative. */
export const UNIT_TEST_RUNNER = {
  selected: "vitest",
  alternativesConsidered: ["jest"] as const,
  configFile: "vitest.config.ts",
  includeGlob: "src/**/*.test.ts",
  environment: "node",
  packageScript: "test",
} as const;

/**
 * Mandatory when OLTP / tenant-scoped data paths are touched.
 * Cross-tenant leakage must fail the suite.
 */
export const TENANT_ISOLATION_TESTS = {
  mandatoryWhenDataTouched: true,
  cover: [
    "cross_merchant_read_denied",
    "cross_merchant_update_denied",
    "store_scope_under_merchant",
    "jwt_merchant_id_filter",
  ] as const,
  relatedContract: "src/multi-tenant-isolation",
  relatedAdr: "ADR-048",
} as const;

/**
 * Mandatory when authentication or authorization surfaces change.
 */
export const AUTHZ_TESTS = {
  mandatoryWhenAuthTouched: true,
  cover: [
    "forbidden_role",
    "missing_credentials",
    "platform_admin_exception_audited",
  ] as const,
  relatedAdrs: ["ADR-031", "ADR-033", "ADR-034"] as const,
} as const;

/**
 * Iranian First — regression notes for UX / presentation helpers.
 * When copy or formatting is in scope, tests must lock Persian observables.
 */
export const PERSIAN_STRING_REGRESSION = {
  requiredWhenUxInScope: true,
  coverFaStringsForCriticalPaths: true,
  fixturesMayIncludePersianNames: true,
  utf8MustNotCorrupt: true,
  rtlLayoutOrScreenshotsWhenShellsFeasible: true,
  tomanFormatTestsWhenMoneyDisplayTouched: true,
  jalaliFormatTestsWhenDateDisplayTouched: true,
  note:
    "When UX copy or Iranian formats are in scope, assert observable fa-IR strings " +
    "(and تومان / Jalali helpers) so English/LTR regressions fail CI.",
} as const;

/** Sample Persian fixture snippet — validates UTF-8 fixture policy in tests. */
export const PERSIAN_FIXTURE_EXAMPLES = {
  merchantDisplayName: "فروشگاه نمونه کرمان",
  customerDisplayName: "علی رضایی",
  productName: "نان سنگک",
} as const;

/**
 * Journeys / paths that must stay covered once features land.
 * POS CompleteSale is a must-cover money path (ADR Decision).
 */
export const MUST_COVER_PATHS = {
  posCompleteSale: true,
  authMerchantOtp: true,
  storefrontPickupOrder: true,
  barcodeLookup: true,
  forbidDeliveryAsRequiredJourney: true,
} as const;

/**
 * Quality rules for every suite (docs/rules/testing-rules.md).
 */
export const TESTING_QUALITY_RULES = {
  domainLogicUnitWithoutDb: true,
  useCasesIntegrationWithDbOrRedis: true,
  authZAndTenantIsolationRequired: true,
  criticalPosPathCovered: true,
  noEmptyTests: true,
  assertionsOnObservables: true,
  deterministicTimeAndPhoneFixtures: true,
} as const;

/**
 * CI validate gate — local and CI must run the same composite script.
 * Workflow YAML shipped by ADR-069 (`.github/workflows/ci.yml`); build is an
 * additional CI gate outside this composite (see `src/cicd-strategy`).
 */
export const CI_VALIDATE_GATE = {
  scriptName: "validate",
  steps: ["typecheck", "lint", "test"] as const,
  packageJsonPath: "package.json",
  mustRemainComposite: true,
  typecheckStrict: true,
  lintZeroWarningsPreferred: true,
  unitViaVitest: true,
  ciWorkflowFile: ".github/workflows/ci.yml",
  ciWorkflowImplementedBy: "ADR-069",
} as const;

export const TESTING_STRATEGY_REQUIREMENTS = {
  pyramidUnitIntegrationE2e: true,
  vitestForUnit: true,
  tenantIsolationMandatoryWhenDataTouched: true,
  authZMandatoryWhenAuthTouched: true,
  persianStringRegressionWhenUxInScope: true,
  ciValidateGate: true,
  completeSaleMustCover: true,
  layerToolingDepthInAdr079: true,
  noDeliveryE2eRequired: true,
} as const;

export type TouchSurface =
  | "domain_only"
  | "data"
  | "auth"
  | "ux_copy"
  | "pos"
  | "barcode"
  | "ui_shell";

export type TestMatrixPlan = {
  readonly unit: boolean;
  readonly integration: boolean;
  readonly e2e: boolean;
  readonly tenantIsolation: boolean;
  readonly authZ: boolean;
  readonly persianStringRegression: boolean;
  readonly perfSmoke: boolean;
};

/**
 * Derive which test kinds a change must include from touched surfaces.
 */
export function requiredTestsForTouch(
  surfaces: readonly TouchSurface[],
): TestMatrixPlan {
  const set = new Set(surfaces);
  const data = set.has("data");
  const auth = set.has("auth");
  const ux = set.has("ux_copy") || set.has("ui_shell");
  const posOrBarcode = set.has("pos") || set.has("barcode");

  return {
    unit: true,
    integration: data || auth || posOrBarcode,
    e2e: auth || posOrBarcode || set.has("ui_shell"),
    tenantIsolation: data,
    authZ: auth,
    persianStringRegression: ux,
    perfSmoke: posOrBarcode,
  };
}

export function assertPyramidOrder(
  order: readonly string[] = TEST_PYRAMID.order,
): void {
  if (
    order.length !== 3 ||
    order[0] !== "unit" ||
    order[1] !== "integration" ||
    order[2] !== "e2e"
  ) {
    throw new Error(
      'Test pyramid order must be ["unit","integration","e2e"] (ADR-078).',
    );
  }
  if (TEST_PYRAMID.relativeVolume.unit !== "many") {
    throw new Error("Unit layer must be the bulk of the pyramid (ADR-078).");
  }
  if (TEST_PYRAMID.relativeVolume.e2e !== "few") {
    throw new Error("E2E layer must stay thin (ADR-078).");
  }
}

export function assertUnitRunnerIsVitest(
  runner: string = UNIT_TEST_RUNNER.selected,
): void {
  if (runner !== "vitest") {
    throw new Error(
      `Unit test runner must be vitest (ADR-078); got "${runner}".`,
    );
  }
  if (TEST_PYRAMID.unit.runner !== "vitest") {
    throw new Error("TEST_PYRAMID.unit.runner must be vitest (ADR-078).");
  }
}

export function assertTenantIsolationRequiredWhenDataTouched(
  dataTouched: boolean,
  tenantIsolationTestsPresent: boolean,
): void {
  if (!TENANT_ISOLATION_TESTS.mandatoryWhenDataTouched) {
    throw new Error(
      "TENANT_ISOLATION_TESTS.mandatoryWhenDataTouched must be true (ADR-078).",
    );
  }
  if (dataTouched && !tenantIsolationTestsPresent) {
    throw new Error(
      "Tenant isolation tests are mandatory when data is touched (ADR-078 / ADR-048).",
    );
  }
}

export function assertAuthZRequiredWhenAuthTouched(
  authTouched: boolean,
  authZTestsPresent: boolean,
): void {
  if (!AUTHZ_TESTS.mandatoryWhenAuthTouched) {
    throw new Error(
      "AUTHZ_TESTS.mandatoryWhenAuthTouched must be true (ADR-078).",
    );
  }
  if (authTouched && !authZTestsPresent) {
    throw new Error(
      "AuthZ tests are mandatory when auth is touched (ADR-078).",
    );
  }
}

export function assertPersianRegressionWhenUxInScope(
  uxInScope: boolean,
  persianAssertionsPresent: boolean,
): void {
  if (!PERSIAN_STRING_REGRESSION.requiredWhenUxInScope) {
    throw new Error(
      "PERSIAN_STRING_REGRESSION.requiredWhenUxInScope must be true (ADR-078).",
    );
  }
  if (uxInScope && !persianAssertionsPresent) {
    throw new Error(
      "Persian string regression assertions required when UX is in scope (ADR-078 Iranian First).",
    );
  }
}

export function assertPersianFixtureContainsFa(text: string): void {
  if (!/[\u0600-\u06FF]/.test(text)) {
    throw new Error(
      "Persian fixture must contain Persian script (ADR-078 Iranian First).",
    );
  }
}

export function assertCiValidateGate(packageScripts: {
  validate?: string;
  typecheck?: string;
  lint?: string;
  test?: string;
}): void {
  if (!packageScripts.validate) {
    throw new Error(
      'package.json must define a "validate" script (ADR-078 CI gate).',
    );
  }
  const validate = packageScripts.validate;
  for (const step of CI_VALIDATE_GATE.steps) {
    if (!validate.includes(step)) {
      throw new Error(
        `validate script must include "${step}" (ADR-078); got "${validate}".`,
      );
    }
  }
  if (!packageScripts.test || !packageScripts.typecheck || !packageScripts.lint) {
    throw new Error(
      "package.json must define typecheck, lint, and test scripts (ADR-078).",
    );
  }
  if (!packageScripts.test.includes("vitest")) {
    throw new Error(
      `test script must invoke vitest (ADR-078); got "${packageScripts.test}".`,
    );
  }
}

export function assertMustCoverCompleteSale(
  covered: boolean = MUST_COVER_PATHS.posCompleteSale,
): void {
  if (!covered) {
    throw new Error(
      "POS CompleteSale must remain a covered critical path (ADR-078).",
    );
  }
  if (MUST_COVER_PATHS.forbidDeliveryAsRequiredJourney !== true) {
    throw new Error(
      "Delivery must not be a required E2E journey in MVP (ADR-078 / ADR-015).",
    );
  }
}

export function assertNoEmptyTestPolicy(): void {
  if (!TESTING_QUALITY_RULES.noEmptyTests) {
    throw new Error("Empty tests are forbidden (ADR-078).");
  }
  if (!TESTING_QUALITY_RULES.assertionsOnObservables) {
    throw new Error("Tests must assert observables (ADR-078).");
  }
}

export const TESTING_STRATEGY = {
  docs: {
    strategy: TESTING_STRATEGY_DOC,
    rules: TESTING_RULES_DOC,
    pyramid: TEST_PYRAMID_DOC,
  },
  pyramid: TEST_PYRAMID,
  unitRunner: UNIT_TEST_RUNNER,
  tenantIsolationTests: TENANT_ISOLATION_TESTS,
  authZTests: AUTHZ_TESTS,
  persianStringRegression: PERSIAN_STRING_REGRESSION,
  persianFixtureExamples: PERSIAN_FIXTURE_EXAMPLES,
  mustCoverPaths: MUST_COVER_PATHS,
  qualityRules: TESTING_QUALITY_RULES,
  ciValidateGate: CI_VALIDATE_GATE,
  requirements: TESTING_STRATEGY_REQUIREMENTS,
} as const;
