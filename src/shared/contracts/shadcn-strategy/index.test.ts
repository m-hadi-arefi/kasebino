import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPONENT_PATHS } from "../frontend-components/index.js";
import { cn } from "../../../lib/utils.js";
import {
  COMPONENTS_JSON_CONTRACT,
  FORBIDDEN_PARALLEL_DESIGN_SYSTEMS,
  SHADCN_GENERATION_RULES,
  SHADCN_IRANIAN_RULES,
  SHADCN_PATHS,
  SHADCN_RTL_RULES,
  SHADCN_STRATEGY,
  SHADCN_UTIL_PACKAGES,
  SHADCN_VENDOR,
  assertNotParallelDesignSystem,
  assertPrimitiveInstallPath,
  assertShadcnRtlCompatible,
  isForbiddenParallelDesignSystem,
} from "./index.js";

describe("ADR-019 shadcn/ui Strategy", () => {
  it("locks shadcn as owned-copy primitive vendor", () => {
    expect(SHADCN_VENDOR.name).toBe("shadcn/ui");
    expect(SHADCN_VENDOR.sourceModel).toBe("owned-copy");
    expect(SHADCN_VENDOR.runtimeNpmPackageForbidden).toBe(true);
    expect(SHADCN_VENDOR.cliGenerate).toBe(true);
    expect(SHADCN_VENDOR.customizeViaTokens).toBe(true);
    expect(SHADCN_VENDOR.tokensAdr).toBe("ADR-020");
    expect(SHADCN_VENDOR.accessibilityFocusManagementRequired).toBe(true);
    expect(SHADCN_STRATEGY.vendor).toEqual(SHADCN_VENDOR);
  });

  it("targets src/components/ui and forbids legacy shared/ui", () => {
    expect(SHADCN_PATHS.primitivesDir).toBe("src/components/ui");
    expect(SHADCN_PATHS.primitivesDir).toBe(COMPONENT_PATHS.primitives);
    expect(SHADCN_PATHS.legacySharedUi).toBe("src/shared/ui");
    expect(SHADCN_GENERATION_RULES.generateInto).toBe("src/components/ui");
    expect(SHADCN_GENERATION_RULES.forbidGenerateIntoLegacySharedUi).toBe(true);
    expect(SHADCN_GENERATION_RULES.tokensAvailableFrom).toBe("ADR-020");
    expect(SHADCN_GENERATION_RULES.primitivesVisualDeferredTo).toBe("ADR-021+");
    expect(() => assertPrimitiveInstallPath("src/components/ui")).not.toThrow();
    expect(() =>
      assertPrimitiveInstallPath("src/components/ui/button.tsx"),
    ).not.toThrow();
    expect(() => assertPrimitiveInstallPath("src/shared/ui")).toThrow(/Legacy path/);
    expect(() => assertPrimitiveInstallPath("src/components/composites")).toThrow(
      /must live under/,
    );
  });

  it("forbids parallel design systems", () => {
    expect(FORBIDDEN_PARALLEL_DESIGN_SYSTEMS).toEqual(
      expect.arrayContaining([
        "@mui/material",
        "@chakra-ui/react",
        "antd",
        "@mantine/core",
      ]),
    );
    expect(isForbiddenParallelDesignSystem("@mui/material")).toBe(true);
    expect(isForbiddenParallelDesignSystem("class-variance-authority")).toBe(
      false,
    );
    expect(() => assertNotParallelDesignSystem("clsx")).not.toThrow();
    expect(() => assertNotParallelDesignSystem("@chakra-ui/react")).toThrow(
      /Parallel design system/,
    );
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const installed = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    for (const name of FORBIDDEN_PARALLEL_DESIGN_SYSTEMS) {
      expect(installed[name]).toBeUndefined();
    }
  });

  it("requires RTL-first logical props and Iranian adapters", () => {
    expect(SHADCN_RTL_RULES.dir).toBe("rtl");
    expect(SHADCN_RTL_RULES.lang).toBe("fa");
    expect(SHADCN_RTL_RULES.rtlConfiguredInComponentsJson).toBe(true);
    expect(SHADCN_RTL_RULES.logicalPropsMandatory).toBe(true);
    expect(SHADCN_RTL_RULES.persianTypographyNoClip).toBe(true);
    expect(SHADCN_RTL_RULES.keepRadixFocusManagement).toBe(true);
    expect(SHADCN_IRANIAN_RULES.jalaliDatesForUserFacing).toBe(true);
    expect(SHADCN_IRANIAN_RULES.tomanCurrencyDisplay).toBe(true);
    expect(
      SHADCN_IRANIAN_RULES.forbidWesternOnlyDateCurrencySubcomponents,
    ).toBe(true);
    expect(() =>
      assertShadcnRtlCompatible({ rtl: true, logicalProps: true }),
    ).not.toThrow();
    expect(() =>
      assertShadcnRtlCompatible({ rtl: false, logicalProps: true }),
    ).toThrow(/RTL-first/);
  });

  it("ships components.json stub with RTL and ui aliases", () => {
    const root = process.cwd();
    const path = join(root, SHADCN_PATHS.componentsJson);
    expect(existsSync(path)).toBe(true);
    const json = JSON.parse(readFileSync(path, "utf8")) as {
      style: string;
      rsc: boolean;
      tsx: boolean;
      rtl: boolean;
      aliases: Record<string, string>;
      tailwind: { config: string; css: string; cssVariables: boolean };
    };
    expect(json.style).toBe(COMPONENTS_JSON_CONTRACT.style);
    expect(json.rsc).toBe(true);
    expect(json.tsx).toBe(true);
    expect(json.rtl).toBe(true);
    expect(json.aliases.ui).toBe("@/components/ui");
    expect(json.aliases.utils).toBe("@/lib/utils");
    expect(json.aliases.components).toBe("@/components");
    expect(json.tailwind.config).toBe("tailwind.config.ts");
    expect(json.tailwind.css).toBe("app/globals.css");
    expect(json.tailwind.cssVariables).toBe(true);
  });

  it("provides cn utils with clsx + tailwind-merge (ADR-020)", () => {
    expect(existsSync(join(process.cwd(), SHADCN_PATHS.utils))).toBe(true);
    expect(SHADCN_UTIL_PACKAGES.stubProvidesCnWithoutDeps).toBe(false);
    expect(SHADCN_UTIL_PACKAGES.deferredUntilTailwindAdr).toBe(false);
    expect(SHADCN_UTIL_PACKAGES.cnUsesClsxAndTailwindMerge).toBe(true);
    expect(SHADCN_UTIL_PACKAGES.packages).toEqual(
      expect.arrayContaining([
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ]),
    );
    expect(cn("px-2", false, "font-bold", null, ["text-start"])).toBe(
      "px-2 font-bold text-start",
    );
  });

  it("keeps primitives dir reserved (CLI generate after uiuxpromax)", () => {
    const root = process.cwd();
    expect(existsSync(join(root, SHADCN_PATHS.primitivesDir))).toBe(true);
    expect(existsSync(join(root, SHADCN_PATHS.legacySharedUi))).toBe(false);
    expect(existsSync(join(root, SHADCN_PATHS.globalCss))).toBe(true);
    expect(existsSync(join(root, SHADCN_PATHS.tailwindConfig))).toBe(true);
  });
});
