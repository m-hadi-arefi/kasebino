import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { cn } from "../lib/utils.js";
import {
  COMPOSITE_REACT_MODULES,
} from "./composites/index.js";
import {
  applyPhoneKeypadInput,
  formatJalaliFa,
  formatTomanFa,
  pasteIranianPhone,
  PHONE_PLACEHOLDER_FA,
  STATUS_CHIP_LABELS_FA,
  TOMAN_PLACEHOLDER_FA,
  TOMAN_SUFFIX_FA,
} from "./composites/iranian-defaults.js";
import { POS_DOMAIN_COMPONENTS } from "./domain/pos/index.js";
import { CRM_DOMAIN_COMPONENTS } from "./domain/crm/index.js";
import { STOREFRONT_DOMAIN_COMPONENTS } from "./domain/storefront/index.js";
import {
  COMPOSITE_BUILDING_BLOCKS,
  SHADCN_MVP_PATHS,
  SHADCN_MVP_PRIMITIVES,
} from "./mvp-primitives.js";

const root = process.cwd();

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

describe("ADR-114 shadcn MVP primitives", () => {
  it("ships every MVP primitive under src/components/ui", () => {
    for (const name of SHADCN_MVP_PRIMITIVES) {
      const file = path.join(root, SHADCN_MVP_PATHS.uiDir, `${name}.tsx`);
      expect(existsSync(file), `missing ${name}.tsx`).toBe(true);
    }
    expect(existsSync(path.join(root, SHADCN_MVP_PATHS.uiDir, ".gitkeep"))).toBe(
      false,
    );
  });

  it("ui dir is not gitkeep-only", () => {
    const entries = readdirSync(path.join(root, SHADCN_MVP_PATHS.uiDir));
    expect(entries.some((e) => e.endsWith(".tsx"))).toBe(true);
  });

  it("cn merges utility classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("ADR-114 Iranian composites", () => {
  it("exposes phone / toman / status / jalali building blocks", () => {
    expect([...COMPOSITE_BUILDING_BLOCKS]).toEqual(
      expect.arrayContaining([...COMPOSITE_REACT_MODULES]),
    );
    for (const name of COMPOSITE_BUILDING_BLOCKS) {
      expect(
        existsSync(path.join(root, SHADCN_MVP_PATHS.compositesDir, `${name}.tsx`)),
      ).toBe(true);
    }
  });

  it("phone helpers use Persian placeholder and normalize Iranian mobiles", () => {
    expect(PHONE_PLACEHOLDER_FA).toMatch(/۰۹/);
    expect(pasteIranianPhone("+989121234567")).toBe("09121234567");
    expect(pasteIranianPhone("۰۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
    expect(applyPhoneKeypadInput("0912", "3")).toBe("09123");
    expect(applyPhoneKeypadInput("0912", "backspace")).toBe("091");
  });

  it("toman display defaults are Persian-ready", () => {
    const label = formatTomanFa(12_500);
    expect(label).toContain(TOMAN_SUFFIX_FA);
    expect(label).toMatch(/۱۲٬۵۰۰|12,500|۱۲.۵۰۰|12.500|۱۲۵۰۰/);
    expect(TOMAN_PLACEHOLDER_FA).toMatch(/تومان/);
  });

  it("status chip map is Persian", () => {
    expect(STATUS_CHIP_LABELS_FA.active).toBe("فعال");
    expect(STATUS_CHIP_LABELS_FA.suspended).toBe("معلق");
  });

  it("jalali helper formats Asia/Tehran", () => {
    const jalali = formatJalaliFa("2026-03-21T12:00:00.000Z");
    expect(jalali.length).toBeGreaterThan(4);
    expect(/[\u06F0-\u06F9\u0660-\u06690-9]/.test(jalali)).toBe(true);
  });
});

describe("ADR-114 RTL kit smoke", () => {
  it("demo page marks dir=rtl and lang=fa", () => {
    const page = readRepo(SHADCN_MVP_PATHS.kitPage);
    expect(page).toMatch(/dir=["']rtl["']/);
    expect(page).toMatch(/lang=["']fa["']/);
    expect(page).toMatch(/تومان|موبایل|پریمیتیو/);
  });

  it("button primitive enforces ≥44px min height", () => {
    const button = readRepo("src/components/ui/button.tsx");
    expect(button).toMatch(/min-h-11/);
  });

  it("dialog/sheet use logical start/end and Persian close label", () => {
    const dialog = readRepo("src/components/ui/dialog.tsx");
    const sheet = readRepo("src/components/ui/sheet.tsx");
    expect(dialog).toMatch(/\bstart-/);
    expect(dialog).toMatch(/\bend-/);
    expect(dialog).toContain("بستن");
    expect(sheet).toMatch(/\bstart-0|\bend-0/);
    expect(sheet).toContain("بستن");
  });
});

describe("ADR-114 domain folders", () => {
  it("pos/crm/storefront expose building-block barrels (not gitkeep-only)", () => {
    expect(POS_DOMAIN_COMPONENTS.length).toBeGreaterThan(0);
    expect(CRM_DOMAIN_COMPONENTS.length).toBeGreaterThan(0);
    expect(STOREFRONT_DOMAIN_COMPONENTS.length).toBeGreaterThan(0);

    for (const folder of [
      SHADCN_MVP_PATHS.domainPos,
      SHADCN_MVP_PATHS.domainCrm,
      SHADCN_MVP_PATHS.domainStorefront,
    ]) {
      expect(existsSync(path.join(root, folder, "index.ts"))).toBe(true);
      expect(existsSync(path.join(root, folder, ".gitkeep"))).toBe(false);
    }
  });
});
