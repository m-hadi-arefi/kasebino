import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  AUTHZ_TESTS,
  CI_VALIDATE_GATE,
  MUST_COVER_PATHS,
  PERSIAN_FIXTURE_EXAMPLES,
  PERSIAN_STRING_REGRESSION,
  TENANT_ISOLATION_TESTS,
  TEST_PYRAMID,
  TESTING_QUALITY_RULES,
  TESTING_STRATEGY,
  TESTING_STRATEGY_REQUIREMENTS,
  UNIT_TEST_RUNNER,
  assertAuthZRequiredWhenAuthTouched,
  assertCiValidateGate,
  assertMustCoverCompleteSale,
  assertNoEmptyTestPolicy,
  assertPersianFixtureContainsFa,
  assertPersianRegressionWhenUxInScope,
  assertPyramidOrder,
  assertTenantIsolationRequiredWhenDataTouched,
  assertUnitRunnerIsVitest,
  requiredTestsForTouch,
} from "./index.js";

const root = process.cwd();

function loadPackageScripts(): {
  validate?: string;
  typecheck?: string;
  lint?: string;
  test?: string;
} {
  const pkg = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ) as {
    scripts?: {
      validate?: string;
      typecheck?: string;
      lint?: string;
      test?: string;
    };
  };
  return pkg.scripts ?? {};
}

describe("ADR-078 Testing Strategy", () => {
  it("defines unit > integration > e2e pyramid volumes", () => {
    expect(TEST_PYRAMID.order).toEqual(["unit", "integration", "e2e"]);
    expect(TEST_PYRAMID.relativeVolume.unit).toBe("many");
    expect(TEST_PYRAMID.relativeVolume.integration).toBe("fewer");
    expect(TEST_PYRAMID.relativeVolume.e2e).toBe("few");
    expect(TEST_PYRAMID.unit.scope).toContain("without_db");
    expect(TEST_PYRAMID.integration.wiringDeferredTo).toBe("ADR-079");
    expect(TEST_PYRAMID.e2e.forbidDeliveryJourneysInMvp).toBe(true);
    expect(TEST_PYRAMID.rejectedAlternatives).toEqual(
      expect.arrayContaining(["only_e2e"]),
    );
    expect(() => assertPyramidOrder()).not.toThrow();
    expect(() => assertPyramidOrder(["e2e", "unit", "integration"])).toThrow(
      /unit.*integration.*e2e/i,
    );
    expect(TESTING_STRATEGY_REQUIREMENTS.pyramidUnitIntegrationE2e).toBe(true);
  });

  it("selects Vitest as the unit runner with config glob", () => {
    expect(UNIT_TEST_RUNNER.selected).toBe("vitest");
    expect(TEST_PYRAMID.unit.runner).toBe("vitest");
    expect(UNIT_TEST_RUNNER.configFile).toBe("vitest.config.ts");
    expect(UNIT_TEST_RUNNER.includeGlob).toBe("src/**/*.test.ts");
    expect(UNIT_TEST_RUNNER.alternativesConsidered).toContain("jest");
    expect(() => assertUnitRunnerIsVitest()).not.toThrow();
    expect(() => assertUnitRunnerIsVitest("jest")).toThrow(/vitest/);
    expect(TESTING_STRATEGY_REQUIREMENTS.vitestForUnit).toBe(true);

    const vitestConfig = readFileSync(join(root, "vitest.config.ts"), "utf8");
    expect(vitestConfig).toMatch(/src\/\*\*\/\*\.test\.ts/);
  });

  it("requires tenant isolation tests when data is touched", () => {
    expect(TENANT_ISOLATION_TESTS.mandatoryWhenDataTouched).toBe(true);
    expect(TENANT_ISOLATION_TESTS.relatedAdr).toBe("ADR-048");
    expect(TENANT_ISOLATION_TESTS.cover).toEqual(
      expect.arrayContaining([
        "cross_merchant_read_denied",
        "jwt_merchant_id_filter",
      ]),
    );
    expect(() =>
      assertTenantIsolationRequiredWhenDataTouched(true, true),
    ).not.toThrow();
    expect(() =>
      assertTenantIsolationRequiredWhenDataTouched(true, false),
    ).toThrow(/Tenant isolation/);
    expect(() =>
      assertTenantIsolationRequiredWhenDataTouched(false, false),
    ).not.toThrow();
    expect(
      TESTING_STRATEGY_REQUIREMENTS.tenantIsolationMandatoryWhenDataTouched,
    ).toBe(true);
  });

  it("requires AuthZ tests when auth is touched", () => {
    expect(AUTHZ_TESTS.mandatoryWhenAuthTouched).toBe(true);
    expect(AUTHZ_TESTS.relatedAdrs).toEqual(
      expect.arrayContaining(["ADR-031", "ADR-034"]),
    );
    expect(() =>
      assertAuthZRequiredWhenAuthTouched(true, true),
    ).not.toThrow();
    expect(() =>
      assertAuthZRequiredWhenAuthTouched(true, false),
    ).toThrow(/AuthZ/);
    expect(TESTING_STRATEGY_REQUIREMENTS.authZMandatoryWhenAuthTouched).toBe(
      true,
    );
  });

  it("encodes Persian string regression and fa fixtures for UX scope", () => {
    expect(PERSIAN_STRING_REGRESSION.requiredWhenUxInScope).toBe(true);
    expect(PERSIAN_STRING_REGRESSION.coverFaStringsForCriticalPaths).toBe(true);
    expect(PERSIAN_STRING_REGRESSION.fixturesMayIncludePersianNames).toBe(true);
    expect(PERSIAN_STRING_REGRESSION.tomanFormatTestsWhenMoneyDisplayTouched).toBe(
      true,
    );
    expect(PERSIAN_STRING_REGRESSION.jalaliFormatTestsWhenDateDisplayTouched).toBe(
      true,
    );
    expect(PERSIAN_STRING_REGRESSION.note).toMatch(/fa-IR|Persian|fa/i);

    expect(() =>
      assertPersianRegressionWhenUxInScope(true, true),
    ).not.toThrow();
    expect(() =>
      assertPersianRegressionWhenUxInScope(true, false),
    ).toThrow(/Persian string/);

    for (const value of Object.values(PERSIAN_FIXTURE_EXAMPLES)) {
      expect(() => assertPersianFixtureContainsFa(value)).not.toThrow();
    }
    expect(() => assertPersianFixtureContainsFa("English only")).toThrow(
      /Persian script/,
    );
    expect(
      TESTING_STRATEGY_REQUIREMENTS.persianStringRegressionWhenUxInScope,
    ).toBe(true);
  });

  it("keeps CI validate gate as typecheck + lint + vitest test", () => {
    expect(CI_VALIDATE_GATE.scriptName).toBe("validate");
    expect(CI_VALIDATE_GATE.steps).toEqual(["typecheck", "lint", "test"]);
    expect(CI_VALIDATE_GATE.unitViaVitest).toBe(true);
    expect(CI_VALIDATE_GATE.ciWorkflowFile).toBe(".github/workflows/ci.yml");
    expect(CI_VALIDATE_GATE.ciWorkflowImplementedBy).toBe("ADR-069");

    const scripts = loadPackageScripts();
    expect(() => assertCiValidateGate(scripts)).not.toThrow();
    expect(scripts.validate).toMatch(/typecheck/);
    expect(scripts.validate).toMatch(/lint/);
    expect(scripts.validate).toMatch(/test/);
    expect(scripts.test).toMatch(/vitest/);

    expect(() =>
      assertCiValidateGate({
        validate: "npm run typecheck && npm run lint",
        typecheck: "tsc",
        lint: "eslint .",
        test: "vitest run",
      }),
    ).toThrow(/test/);
    expect(TESTING_STRATEGY_REQUIREMENTS.ciValidateGate).toBe(true);
  });

  it("marks CompleteSale must-cover and forbids delivery as required e2e", () => {
    expect(MUST_COVER_PATHS.posCompleteSale).toBe(true);
    expect(MUST_COVER_PATHS.storefrontPickupOrder).toBe(true);
    expect(MUST_COVER_PATHS.forbidDeliveryAsRequiredJourney).toBe(true);
    expect(() => assertMustCoverCompleteSale()).not.toThrow();
    expect(() => assertMustCoverCompleteSale(false)).toThrow(/CompleteSale/);
    expect(TESTING_STRATEGY_REQUIREMENTS.completeSaleMustCover).toBe(true);
    expect(TESTING_STRATEGY_REQUIREMENTS.noDeliveryE2eRequired).toBe(true);
  });

  it("encodes quality rules and derives touch-surface matrix", () => {
    expect(TESTING_QUALITY_RULES.domainLogicUnitWithoutDb).toBe(true);
    expect(TESTING_QUALITY_RULES.authZAndTenantIsolationRequired).toBe(true);
    expect(TESTING_QUALITY_RULES.noEmptyTests).toBe(true);
    expect(() => assertNoEmptyTestPolicy()).not.toThrow();

    const dataPlan = requiredTestsForTouch(["data"]);
    expect(dataPlan.unit).toBe(true);
    expect(dataPlan.tenantIsolation).toBe(true);
    expect(dataPlan.authZ).toBe(false);
    expect(dataPlan.persianStringRegression).toBe(false);

    const authUx = requiredTestsForTouch(["auth", "ux_copy"]);
    expect(authUx.authZ).toBe(true);
    expect(authUx.persianStringRegression).toBe(true);
    expect(authUx.e2e).toBe(true);

    const posPlan = requiredTestsForTouch(["pos", "barcode"]);
    expect(posPlan.perfSmoke).toBe(true);
    expect(posPlan.integration).toBe(true);
  });

  it("exports TESTING_STRATEGY aggregate and docs pointers", () => {
    expect(TESTING_STRATEGY.docs.strategy).toBe("docs/testing/strategy.md");
    expect(TESTING_STRATEGY.docs.rules).toBe("docs/rules/testing-rules.md");
    expect(TESTING_STRATEGY.docs.pyramid).toBe("docs/testing/test-pyramid.md");
    expect(TESTING_STRATEGY.unitRunner.selected).toBe("vitest");
    expect(TESTING_STRATEGY.requirements.layerToolingDepthInAdr079).toBe(true);
    expect(TESTING_STRATEGY.ciValidateGate.mustRemainComposite).toBe(true);
  });
});
