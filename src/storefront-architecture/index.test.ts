import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CACHE_TTL_SECONDS } from "../cache-keys/index.js";
import { STOREFRONT_URL } from "../product-architecture/index.js";
import {
  STOREFRONT_ARCHITECTURE,
  STOREFRONT_ARCHITECTURE_DECISION,
  STOREFRONT_APP_PATHS,
  STOREFRONT_BRANDING_FIELDS,
  STOREFRONT_CACHE,
  STOREFRONT_COPY_FA,
  STOREFRONT_EVENTS,
  STOREFRONT_PICKUP_CTA,
  STOREFRONT_PUBLIC_ACL,
  STOREFRONT_SURFACES,
  STOREFRONT_UIUX_GATE,
  assertNoDeliveryOnStorefront,
  assertNoStorefrontPosImport,
  assertStorefrontAllowedReadContext,
  assertStorefrontBranding,
  assertStorefrontPickupOnly,
  assertStorefrontPublicDto,
  assertStorefrontSubdomainNotRequired,
  assertStorefrontUiuxGate,
  isStorefrontAllowedReadContext,
  storefrontAboutPath,
  storefrontCatalogPath,
  storefrontHomePath,
  storefrontPickupEntryPath,
} from "./index.js";

describe("ADR-086 Storefront Architecture", () => {
  it("locks dedicated path URL /s/{storeSlug} without subdomain requirement", () => {
    expect(STOREFRONT_ARCHITECTURE_DECISION.dedicatedPerStore).toBe(true);
    expect(STOREFRONT_ARCHITECTURE_DECISION.urlStrategy).toBe("path");
    expect(STOREFRONT_ARCHITECTURE_DECISION.pathPattern).toBe(STOREFRONT_URL.pattern);
    expect(STOREFRONT_ARCHITECTURE_DECISION.subdomainRequiredInMvp).toBe(false);
    expect(STOREFRONT_ARCHITECTURE_DECISION.marketplace).toBe(false);
    expect(() => assertStorefrontSubdomainNotRequired(false)).not.toThrow();
    expect(() => assertStorefrontSubdomainNotRequired(true)).toThrow(/subdomain/i);
    expect(storefrontHomePath("atina-kerman")).toBe("/s/atina-kerman");
    expect(storefrontCatalogPath("atina-kerman")).toBe("/s/atina-kerman/catalog");
    expect(storefrontAboutPath("atina-kerman")).toBe("/s/atina-kerman/about");
    expect(storefrontPickupEntryPath("atina-kerman")).toBe(
      "/s/atina-kerman/pickup",
    );
  });

  it("ACL allows catalog/ordering only and forbids POS domain imports", () => {
    expect(STOREFRONT_PUBLIC_ACL.allowedReadContexts).toEqual([
      "catalog",
      "ordering",
    ]);
    expect(isStorefrontAllowedReadContext("catalog")).toBe(true);
    expect(isStorefrontAllowedReadContext("ordering")).toBe(true);
    expect(isStorefrontAllowedReadContext("pos")).toBe(false);
    expect(isStorefrontAllowedReadContext("loyalty")).toBe(false);
    expect(() => assertStorefrontAllowedReadContext("catalog")).not.toThrow();
    expect(() => assertStorefrontAllowedReadContext("pos")).toThrow(/ACL/i);
    expect(STOREFRONT_ARCHITECTURE.isForbiddenPosImport("pos")).toBe(true);
    expect(() => assertNoStorefrontPosImport("pos")).toThrow(/pos/i);
    expect(() => assertNoStorefrontPosImport("catalog")).not.toThrow();
  });

  it("rejects sensitive fields on public storefront DTOs", () => {
    expect(() =>
      assertStorefrontPublicDto({
        id: "p1",
        name: "چای",
        priceToman: 12000,
      }),
    ).not.toThrow();
    expect(() =>
      assertStorefrontPublicDto({ id: "p1", costPrice: 1000 }),
    ).toThrow(/sensitive/i);
    expect(STOREFRONT_PUBLIC_ACL.forbiddenDtoFields).toContain("costPrice");
  });

  it("requires store branding displayName and documents branding fields", () => {
    expect(STOREFRONT_BRANDING_FIELDS).toEqual(
      expect.arrayContaining([
        "displayName",
        "logoObjectKey",
        "primaryColor",
        "accentColor",
      ]),
    );
    expect(() =>
      assertStorefrontBranding({ displayName: "آتینا کرمان" }),
    ).not.toThrow();
    expect(() => assertStorefrontBranding({ displayName: "  " })).toThrow(
      /displayName/i,
    );
  });

  it("pickup CTA is Persian and delivery/marketplace is forbidden", () => {
    expect(STOREFRONT_PICKUP_CTA.fulfillmentMode).toBe("pickup");
    expect(STOREFRONT_PICKUP_CTA.deliveryForbidden).toBe(true);
    expect(STOREFRONT_PICKUP_CTA.labelFa).toMatch(/پیکاپ|حضوری/);
    expect(STOREFRONT_PICKUP_CTA.minTouchTargetPx).toBeGreaterThanOrEqual(44);
    expect(STOREFRONT_COPY_FA.pickupOnlyHint).toMatch(/پیکاپ/);
    expect(STOREFRONT_COPY_FA.noDelivery).toMatch(/پیک/);
    expect(() => assertStorefrontPickupOnly("pickup")).not.toThrow();
    expect(() => assertStorefrontPickupOnly("delivery")).toThrow();
    expect(() => assertNoDeliveryOnStorefront("delivery")).toThrow(/delivery/i);
    expect(() => assertNoDeliveryOnStorefront("marketplace")).toThrow(
      /marketplace/i,
    );
  });

  it("public cache is 600s and StorefrontVisited is reserved", () => {
    expect(STOREFRONT_CACHE.publicRoutesRevalidateSeconds).toBe(600);
    expect(STOREFRONT_CACHE.ttlClassSeconds).toBe(CACHE_TTL_SECONDS.storefront);
    expect(STOREFRONT_ARCHITECTURE_DECISION.publicCacheSeconds).toBe(600);
    expect(STOREFRONT_EVENTS.visited).toBe("StorefrontVisited");
  });

  it("surfaces include home, catalog, about with Persian titles", () => {
    expect(STOREFRONT_SURFACES.home.titleFa).toMatch(/ویترین|فروشگاه/);
    expect(STOREFRONT_SURFACES.catalog.titleFa).toMatch(/کاتالوگ/);
    expect(STOREFRONT_SURFACES.about.titleFa).toMatch(/مغازه|درباره/);
    expect(STOREFRONT_SURFACES.customerDashboard.titleFa).toMatch(/پنل/);
    expect(STOREFRONT_COPY_FA.catalogEmpty).toMatch(/کالا/);
    expect(STOREFRONT_COPY_FA.loading).toMatch(/بارگذاری/);
    expect(STOREFRONT_COPY_FA.priceUnit).toBe("تومان");
    expect(STOREFRONT_COPY_FA.navDashboard).toMatch(/پنل/);
  });

  it("scaffolds Persian RTL home, catalog, and about routes", () => {
    const root = process.cwd();
    for (const rel of [
      STOREFRONT_APP_PATHS.homePage,
      STOREFRONT_APP_PATHS.catalogPage,
      STOREFRONT_APP_PATHS.aboutPage,
      STOREFRONT_APP_PATHS.groupLayout,
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }

    const home = readFileSync(join(root, STOREFRONT_APP_PATHS.homePage), "utf8");
    const catalog = readFileSync(
      join(root, STOREFRONT_APP_PATHS.catalogPage),
      "utf8",
    );
    const about = readFileSync(join(root, STOREFRONT_APP_PATHS.aboutPage), "utf8");
    const layout = readFileSync(
      join(root, STOREFRONT_APP_PATHS.groupLayout),
      "utf8",
    );

    expect(home).toMatch(/ویترین|فروشگاه/);
    expect(home).toMatch(/پیکاپ|حضوری/);
    expect(home).toMatch(/catalog|کاتالوگ/);
    expect(home).toMatch(/dashboard|پنل من/);
    expect(home).not.toMatch(/delivery|courier/i);
    expect(catalog).toMatch(/کاتالوگ|emptyCatalog|catalogTitle/);
    const storefrontCopy = readFileSync(
      join(root, "src/modules/storefront/ui/copy.ts"),
      "utf8",
    );
    expect(storefrontCopy).toMatch(/هنوز کالایی|کالا/);
    expect(about).toMatch(/درباره|مغازه/);
    expect(layout).toMatch(/ویترین|فروشگاه/);
    expect(home).toMatch(/revalidate\s*=\s*600/);
    expect(catalog).toMatch(/revalidate\s*=\s*600/);
    expect(about).toMatch(/revalidate\s*=\s*600/);
  });

  it("passes uiuxpromax gate with Persian RTL mobile storefront brief", () => {
    expect(STOREFRONT_UIUX_GATE.brief.persian).toBe(true);
    expect(STOREFRONT_UIUX_GATE.brief.rtl).toBe(true);
    expect(STOREFRONT_UIUX_GATE.brief.mobile390).toBe(true);
    expect(STOREFRONT_UIUX_GATE.brief.iranianRetailContext).toBe(true);
    expect(() => assertStorefrontUiuxGate()).not.toThrow();
    expect(STOREFRONT_ARCHITECTURE.decision.adr).toBe("ADR-086");
  });
});
