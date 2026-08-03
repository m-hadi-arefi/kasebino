import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "../lib/utils.js";
import {
  A11Y_TOKEN_RULES,
  DENSITY_TOKENS,
  DESIGN_TOKEN_NAMES,
  PERSIAN_TYPOGRAPHY,
  RTL_TOKEN_RULES,
  TAILWIND_DESIGN_SYSTEM,
  TAILWIND_ENGINE,
  TAILWIND_PATHS,
  TAILWIND_UTIL_PACKAGES,
  VISUAL_DIRECTION,
  assertDesignTokenPresent,
  assertNotPurpleDefaultAesthetic,
  assertRtlLogicalUtilities,
} from "./index.js";

const root = process.cwd();

describe("ADR-020 Tailwind Design System Strategy", () => {
  it("locks Tailwind v4 CSS-first engine", () => {
    expect(TAILWIND_ENGINE.name).toBe("tailwindcss");
    expect(TAILWIND_ENGINE.major).toBe(4);
    expect(TAILWIND_ENGINE.cssFirst).toBe(true);
    expect(TAILWIND_ENGINE.postcssPlugin).toBe("@tailwindcss/postcss");
    expect(TAILWIND_ENGINE.mobileFirst).toBe(true);
    expect(TAILWIND_DESIGN_SYSTEM.engine).toEqual(TAILWIND_ENGINE);
  });

  it("ships config, postcss, and globals paths", () => {
    expect(existsSync(join(root, TAILWIND_PATHS.globalCss))).toBe(true);
    expect(existsSync(join(root, TAILWIND_PATHS.postcssConfig))).toBe(true);
    expect(existsSync(join(root, TAILWIND_PATHS.configStub))).toBe(true);
    expect(existsSync(join(root, TAILWIND_PATHS.layout))).toBe(true);
    expect(existsSync(join(root, TAILWIND_PATHS.utils))).toBe(true);
    expect(existsSync(join(root, TAILWIND_PATHS.contractDir))).toBe(true);
  });

  it("defines design-system.md CSS variable tokens in globals.css", () => {
    const css = readFileSync(join(root, TAILWIND_PATHS.globalCss), "utf8");
    expect(css).toContain('@import "tailwindcss"');
    for (const token of DESIGN_TOKEN_NAMES) {
      expect(css).toContain(token);
      assertDesignTokenPresent(css, token);
    }
    expect(css).toContain(DENSITY_TOKENS.posTapMinCssVar);
    expect(css).toContain("2.75rem");
    expect(css).toContain("#0f6b63");
    expect(css).not.toMatch(/#7c3aed|#8b5cf6|#6366f1/i);
  });

  it("encodes Iranian retail visual direction (no purple AI default)", () => {
    expect(VISUAL_DIRECTION.forbidPurpleDefaultAiAesthetic).toBe(true);
    expect(VISUAL_DIRECTION.forbidCreamTerracottaCliché).toBe(true);
    expect(VISUAL_DIRECTION.primaryHueFamily).toBe("teal");
    expect(VISUAL_DIRECTION.docs).toBe("docs/uiux/design-system.md");
    expect(() => assertNotPurpleDefaultAesthetic("#0f6b63")).not.toThrow();
    expect(() => assertNotPurpleDefaultAesthetic("#7c3aed")).toThrow(
      /purple-default/,
    );
  });

  it("wires Persian Vazirmatn typography in layout", () => {
    expect(PERSIAN_TYPOGRAPHY.primaryFont).toBe("Vazirmatn");
    expect(PERSIAN_TYPOGRAPHY.minBodyPx).toBe(16);
    const layout = readFileSync(join(root, TAILWIND_PATHS.layout), "utf8");
    expect(layout).toContain('import "./globals.css"');
    expect(layout).toContain("Vazirmatn");
    expect(layout).toContain(PERSIAN_TYPOGRAPHY.cssVariable);
    expect(layout).toMatch(/lang="fa"/);
    expect(layout).toMatch(/dir="rtl"/);
  });

  it("requires RTL-first logical properties", () => {
    expect(RTL_TOKEN_RULES.dir).toBe("rtl");
    expect(RTL_TOKEN_RULES.lang).toBe("fa");
    expect(RTL_TOKEN_RULES.logicalPropsMandatory).toBe(true);
    expect(RTL_TOKEN_RULES.forbidPhysicalSpine).toBe(true);
    expect(RTL_TOKEN_RULES.preferLogicalUtilities).toEqual(
      expect.arrayContaining(["ms-", "me-", "text-start", "padding-inline"]),
    );
    expect(() =>
      assertRtlLogicalUtilities({ rtl: true, logicalProps: true }),
    ).not.toThrow();
    expect(() =>
      assertRtlLogicalUtilities({ rtl: false, logicalProps: true }),
    ).toThrow(/RTL-first/);
  });

  it("encodes POS tap density ≥44px and AA contrast target", () => {
    expect(DENSITY_TOKENS.posTapMinPx).toBe(44);
    expect(A11Y_TOKEN_RULES.contrastTarget).toBe("WCAG_AA");
  });

  it("upgrades cn with clsx + tailwind-merge", () => {
    expect(TAILWIND_UTIL_PACKAGES.cnUsesClsxAndTailwindMerge).toBe(true);
    expect(cn("px-2", false, "font-bold", null, ["text-start"])).toBe(
      "px-2 font-bold text-start",
    );
    expect(cn("p-2", "p-4")).toBe("p-4");
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const installed = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of TAILWIND_UTIL_PACKAGES.packages) {
      expect(installed[name]).toBeDefined();
    }
    for (const name of TAILWIND_UTIL_PACKAGES.enginePackages) {
      expect(installed[name]).toBeDefined();
    }
  });

  it("keeps components.json pointing at globals + config stub", () => {
    const json = JSON.parse(
      readFileSync(join(root, "components.json"), "utf8"),
    ) as { tailwind: { config: string; css: string; cssVariables: boolean } };
    expect(json.tailwind.config).toBe(TAILWIND_PATHS.configStub);
    expect(json.tailwind.css).toBe(TAILWIND_PATHS.globalCss);
    expect(json.tailwind.cssVariables).toBe(true);
  });
});
