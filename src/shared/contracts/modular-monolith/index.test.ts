import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALE_DEFAULTS } from "../../architecture/product/index.js";
import { BOUNDED_CONTEXT_MODULES, MODULE_LAYERS } from "../../ddd/index.js";
import {
  APP_SHELL_LOCALIZATION,
  DEPLOYABLE,
  DEPLOYMENT_MODEL,
  EXTRACTION_ORDER,
  FORBIDDEN_UNTIL_EXTRACTION,
  MODULAR_MONOLITH,
  MODULE_BOUNDARY_RULES,
  MODULE_ROOT,
  MONOLITH_MODULES,
  OUTBOX_SPINE,
  SHARED_MIDDLEWARE,
  assertDomainMayNotJoinModules,
  assertNoDeliveryModule,
  assertWorkersShareCodebase,
  isMonolithModule,
} from "./index.js";

describe("ADR-004 Modular monolith strategy", () => {
  it("deploys as a single modular monolith with workers sharing the codebase", () => {
    expect(DEPLOYMENT_MODEL).toBe("modular_monolith");
    expect(DEPLOYABLE.runtime).toBe("nextjs");
    expect(DEPLOYABLE.unitOfDeploy).toBe("whole_app");
    expect(DEPLOYABLE.workersShareCodebase).toBe(true);
    expect(() => assertWorkersShareCodebase()).not.toThrow();
    expect(MODULAR_MONOLITH.deploymentModel).toBe(DEPLOYMENT_MODEL);
  });

  it("registers all ADR-002 modules under src/modules without a delivery module", () => {
    expect(MODULE_ROOT).toBe("src/modules");
    expect(MONOLITH_MODULES).toEqual(BOUNDED_CONTEXT_MODULES);
    expect(MONOLITH_MODULES).not.toContain("delivery");
    expect(() => assertNoDeliveryModule(MONOLITH_MODULES)).not.toThrow();
    expect(() => assertNoDeliveryModule(["pos", "delivery"])).toThrow(/delivery/i);
    expect(isMonolithModule("pos")).toBe(true);
    expect(isMonolithModule("delivery")).toBe(false);

    const root = join(process.cwd(), MODULE_ROOT);
    for (const mod of MONOLITH_MODULES) {
      for (const layer of MODULE_LAYERS) {
        expect(existsSync(join(root, mod, layer))).toBe(true);
      }
    }
  });

  it("forbids cross-module DB joins in domain services", () => {
    expect(MODULE_BOUNDARY_RULES.noCrossModuleDbJoinsInDomain).toBe(true);
    expect(MODULE_BOUNDARY_RULES.compositionLayer).toBe("application");
    expect(MODULE_BOUNDARY_RULES.publishedLanguage).toBe("domain_events");
    expect(() => assertDomainMayNotJoinModules("pos", "pos")).not.toThrow();
    expect(() => assertDomainMayNotJoinModules("pos", "inventory")).toThrow(
      /cross-module/i,
    );
  });

  it("uses transactional outbox as the integration spine for many consumers", () => {
    expect(MODULE_BOUNDARY_RULES.integrationSpine).toBe("transactional_outbox");
    expect(OUTBOX_SPINE.pattern).toBe("transactional_outbox");
    expect(OUTBOX_SPINE.feeds).toEqual(
      expect.arrayContaining([
        "emqx_realtime",
        "mongodb_warehouse",
        "cache_invalidation",
      ]),
    );
    expect(OUTBOX_SPINE.analyticsOnCheckoutCriticalPath).toBe(false);
  });

  it("defines shared security and Iranian First shell middleware slots", () => {
    expect(SHARED_MIDDLEWARE).toEqual(
      expect.arrayContaining([
        "security",
        "tenant_isolation",
        "persian_i18n",
        "rtl_layout",
      ]),
    );
    expect(APP_SHELL_LOCALIZATION.strategy).toBe("shared_app_shell");
    expect(APP_SHELL_LOCALIZATION.locale).toBe("fa-IR");
    expect(APP_SHELL_LOCALIZATION.dir).toBe("rtl");
    expect(APP_SHELL_LOCALIZATION.language).toBe(LOCALE_DEFAULTS.language);
    expect(APP_SHELL_LOCALIZATION.moneyDisplayUnit).toBe(
      LOCALE_DEFAULTS.moneyDisplayUnit,
    );
  });

  it("documents extraction order and forbids premature microservice splits", () => {
    expect(EXTRACTION_ORDER.length).toBeGreaterThanOrEqual(3);
    expect(EXTRACTION_ORDER[0]).toBe("realtime_gateway");
    expect(FORBIDDEN_UNTIL_EXTRACTION).toEqual(
      expect.arrayContaining([
        "premature_multi_repo_split",
        "distributed_2pc",
        "delivery_module",
      ]),
    );
  });
});
