import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../uiuxpromax-gate/index.js";
import {
  MARKETING_COPY_FA,
  MARKETING_CTA,
  MARKETING_SECTION_IDS,
  MARKETING_SEO_FA,
  MARKETING_UIUX_GATE,
} from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../../..");

describe("ADR-122 marketing landing", () => {
  it("passes uiuxpromax Persian+RTL brief gate", () => {
    expect(() => assertUiuxGate(MARKETING_UIUX_GATE)).not.toThrow();
  });

  it("ships all PRD §13 section ids and Persian brand copy", () => {
    expect(MARKETING_SECTION_IDS).toEqual([
      "hero",
      "features",
      "benefits",
      "how-it-works",
      "screenshots",
      "pricing",
      "faq",
      "cta",
      "footer",
    ]);
    expect(MARKETING_COPY_FA.brand).toBe("کاسبینو");
    expect(MARKETING_COPY_FA.heroHeadline).toMatch(/[\u0600-\u06FF]/);
    expect(MARKETING_COPY_FA.features).toHaveLength(6);
    expect(MARKETING_COPY_FA.howSteps).toHaveLength(4);
    expect(MARKETING_COPY_FA.faq.length).toBeGreaterThanOrEqual(3);
  });

  it("states free Kerman pilot without invented fee tables", () => {
    expect(MARKETING_COPY_FA.pricingHeadline).toMatch(/پایلوت رایگان کرمان/);
    expect(MARKETING_COPY_FA.pricingBody).toMatch(/رایگان/);
    expect(MARKETING_COPY_FA.pricingBody).not.toMatch(/%\s*\d|تومان\s*[\d۰-۹]/);
    expect(MARKETING_COPY_FA.pricingNote).toMatch(/ساختگی|پولی/);
  });

  it("CTAs target merchant auth login", () => {
    expect(MARKETING_CTA.primaryHref).toMatch(/^\/login/);
    expect(MARKETING_CTA.secondaryHref).toBe("/login");
  });

  it("SEO metadata is Persian", () => {
    expect(MARKETING_SEO_FA.title).toMatch(/کاسبینو/);
    expect(MARKETING_SEO_FA.description).toMatch(/[\u0600-\u06FF]/);
    expect(MARKETING_SEO_FA.ogDescription).toMatch(/[\u0600-\u06FF]/);
  });

  it("does not pitch delivery as the default journey", () => {
    const blob = JSON.stringify(MARKETING_COPY_FA);
    expect(blob).not.toMatch(/\bdelivery\b|\bcourier\b/i);
    expect(MARKETING_COPY_FA.benefits[2]?.body).toMatch(/حضوری|مغازه/);
  });

  it("landing page composes all sections with RTL/CTA markers", () => {
    const page = readFileSync(
      join(repoRoot, "app/(marketing)/page.tsx"),
      "utf8",
    );
    const layout = readFileSync(
      join(repoRoot, "app/(marketing)/layout.tsx"),
      "utf8",
    );
    for (const id of MARKETING_SECTION_IDS) {
      expect(page).toContain(`id="${id}"`);
    }
    expect(page).toContain('dir="rtl"');
    expect(page).toContain("MARKETING_CTA");
    expect(page).toContain("pricingHeadline");
    expect(page).toContain("hero-shop.svg");
    expect(layout).toContain("openGraph");
    expect(layout).toMatch(/MARKETING_SEO_FA|کاسبینو/);
  });
});
