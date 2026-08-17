import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_STRUCTURE } from "../nextjs-architecture/index.js";
import {
  COMPONENT_LAYERS,
  COMPONENT_PATHS,
  DENSITY_VARIANTS,
  DOMAIN_COMPONENT_FOLDERS,
  FORBIDDEN_DOMAIN_COMPONENT_FOLDERS,
  FORBIDDEN_PRESENTATIONAL_IMPORT_SEGMENTS,
  FRONTEND_COMPONENTS,
  IRANIAN_ADAPTER_REQUIREMENTS,
  PRESENTATIONAL_RULES,
  RTL_COMPONENT_RULES,
  assertComponentLayer,
  assertDensityVariant,
  assertDomainComponentFolder,
  assertLogicalCssProp,
  assertNoBusinessLogicInPresentational,
  assertNoDomainImportInPrimitive,
  domainComponentPath,
  isDomainComponentFolder,
  isForbiddenDomainComponentFolder,
} from "./index.js";

describe("ADR-018 Frontend Component Architecture", () => {
  it("defines primitives / composites / domain layers", () => {
    expect(COMPONENT_LAYERS.primitives).toBe("primitives");
    expect(COMPONENT_LAYERS.composites).toBe("composites");
    expect(COMPONENT_LAYERS.domain).toBe("domain");
    expect(FRONTEND_COMPONENTS.layers).toEqual(COMPONENT_LAYERS);
    expect(() => assertComponentLayer("primitives")).not.toThrow();
    expect(() => assertComponentLayer("widgets")).toThrow(/Unknown component layer/);
  });

  it("locks folder conventions under src/components", () => {
    expect(COMPONENT_PATHS.root).toBe("src/components");
    expect(COMPONENT_PATHS.primitives).toBe("src/components/ui");
    expect(COMPONENT_PATHS.composites).toBe("src/components/composites");
    expect(COMPONENT_PATHS.domain).toBe("src/components/domain");
    expect(COMPONENT_PATHS.moduleUiGlob).toBe(APP_STRUCTURE.moduleUiGlob);
    expect(COMPONENT_PATHS.legacySharedUi).toBe("src/shared/ui");
  });

  it("reserves domain folders from component-library (no delivery)", () => {
    expect(DOMAIN_COMPONENT_FOLDERS).toEqual(
      expect.arrayContaining([
        "pos",
        "crm",
        "loyalty",
        "catalog",
        "storefront",
        "ordering",
        "analytics",
        "admin",
        "identity",
      ]),
    );
    expect(DOMAIN_COMPONENT_FOLDERS).not.toEqual(
      expect.arrayContaining(["delivery"]),
    );
    expect(FORBIDDEN_DOMAIN_COMPONENT_FOLDERS).toEqual(
      expect.arrayContaining(["delivery", "courier", "shipping"]),
    );
    expect(isDomainComponentFolder("pos")).toBe(true);
    expect(isForbiddenDomainComponentFolder("delivery")).toBe(true);
    expect(domainComponentPath("pos")).toBe("src/components/domain/pos");
    expect(() => assertDomainComponentFolder("pos")).not.toThrow();
    expect(() => assertDomainComponentFolder("delivery")).toThrow(/forbidden/i);
    expect(() => assertDomainComponentFolder("warehouse")).toThrow(/Unknown/);
  });

  it("scaffolds component directories on disk (primitives may be populated)", () => {
    const root = process.cwd();
    expect(existsSync(join(root, COMPONENT_PATHS.root))).toBe(true);
    expect(existsSync(join(root, COMPONENT_PATHS.primitives))).toBe(true);
    expect(existsSync(join(root, COMPONENT_PATHS.composites))).toBe(true);
    expect(existsSync(join(root, COMPONENT_PATHS.domain))).toBe(true);
    for (const folder of DOMAIN_COMPONENT_FOLDERS) {
      expect(existsSync(join(root, domainComponentPath(folder)))).toBe(true);
    }
    const domainChildren = readdirSync(join(root, COMPONENT_PATHS.domain));
    expect(domainChildren).not.toEqual(
      expect.arrayContaining(["delivery", "courier", "shipping"]),
    );
    // ADR-114 populates shadcn primitives under ui/; directory must remain present.
    const uiEntries = readdirSync(join(root, COMPONENT_PATHS.primitives));
    expect(uiEntries.length).toBeGreaterThan(0);
    expect(
      uiEntries.every((n) => n === ".gitkeep" || n.startsWith(".") || n.endsWith(".tsx")),
    ).toBe(true);
  });

  it("forbids business logic and domain/infra imports in presentational primitives", () => {
    expect(PRESENTATIONAL_RULES.noBusinessLogic).toBe(true);
    expect(PRESENTATIONAL_RULES.noDomainImportsInPrimitives).toBe(true);
    expect(PRESENTATIONAL_RULES.noDirectDbAccess).toBe(true);
    expect(PRESENTATIONAL_RULES.noOrmInUi).toBe(true);
    expect(PRESENTATIONAL_RULES.noSecretsInClientBundles).toBe(true);
    expect(PRESENTATIONAL_RULES.presentationCalls).toBe("application");
    expect(PRESENTATIONAL_RULES.featureUsedOnKeyCtasViaApplication).toBe(true);
    expect(FORBIDDEN_PRESENTATIONAL_IMPORT_SEGMENTS).toEqual(
      expect.arrayContaining(["/domain/", "drizzle-orm"]),
    );
    expect(() => assertNoBusinessLogicInPresentational(false)).not.toThrow();
    expect(() => assertNoBusinessLogicInPresentational(true)).toThrow(
      /business logic/i,
    );
    expect(() =>
      assertNoDomainImportInPrimitive("../shared/utils/cn"),
    ).not.toThrow();
    expect(() =>
      assertNoDomainImportInPrimitive("../../modules/pos/domain/sale"),
    ).toThrow(/must not import/);
    expect(() =>
      assertNoDomainImportInPrimitive("drizzle-orm"),
    ).toThrow(/must not import/);
  });

  it("requires RTL-first logical props and Iranian adapters", () => {
    expect(RTL_COMPONENT_RULES.dir).toBe("rtl");
    expect(RTL_COMPONENT_RULES.lang).toBe("fa");
    expect(RTL_COMPONENT_RULES.locale).toBe("fa-IR");
    expect(RTL_COMPONENT_RULES.logicalPropsMandatory).toBe(true);
    expect(RTL_COMPONENT_RULES.persianTypographyNoClip).toBe(true);
    expect(RTL_COMPONENT_RULES.requiredLogicalCssProps).toEqual(
      expect.arrayContaining(["margin-inline", "padding-inline"]),
    );
    expect(() => assertLogicalCssProp("margin-inline")).not.toThrow();
    expect(() => assertLogicalCssProp("margin-left")).toThrow(/Physical CSS/);
    expect(IRANIAN_ADAPTER_REQUIREMENTS.jalaliDatesForUserFacing).toBe(true);
    expect(IRANIAN_ADAPTER_REQUIREMENTS.tomanCurrencyDisplay).toBe(true);
    expect(
      IRANIAN_ADAPTER_REQUIREMENTS.forbidWesternOnlyDateCurrencySubcomponents,
    ).toBe(true);
  });

  it("defines POS and analytical density variants", () => {
    expect(DENSITY_VARIANTS.pos.minTouchTargetPx).toBe(44);
    expect(DENSITY_VARIANTS.analytical.minTouchTargetPx).toBe(44);
    expect(() => assertDensityVariant("pos")).not.toThrow();
    expect(() => assertDensityVariant("compact")).toThrow(/Unknown density/);
  });
});
