import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_STRUCTURE } from "../nextjs-architecture/index.js";
import {
  STOREFRONT_URL,
  buildStorefrontPath,
} from "../product-architecture/index.js";
import {
  APP_ROUTER_FILESYSTEM,
  APP_ROUTER_STRUCTURE,
  FORBIDDEN_URL_SEGMENTS,
  MIDDLEWARE_GATES,
  ROUTE_AUDIENCE_HEADER,
  ROUTE_GROUPS,
  STOREFRONT_PARAM,
  URL_PATHS,
  assertNoForbiddenUrlSegment,
  assertStorefrontParamName,
  classifyRouteAudience,
  isForbiddenUrlSegment,
  storefrontAppPath,
} from "./index.js";

function walkDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(entry.name);
      out.push(...walkDirs(full));
    }
  }
  return out;
}

describe("ADR-017 App Router structure", () => {
  it("defines audience route groups plus api/v1", () => {
    expect(ROUTE_GROUPS.marketing).toBe("(marketing)");
    expect(ROUTE_GROUPS.merchant).toBe("(merchant)");
    expect(ROUTE_GROUPS.storefront).toBe("(storefront)");
    expect(ROUTE_GROUPS.admin).toBe("(admin)");
    expect(URL_PATHS.apiV1).toBe("/api/v1");
    expect(APP_ROUTER_FILESYSTEM.apiV1Dir).toBe("app/api/v1");
    expect(APP_ROUTER_STRUCTURE.fulfillment).toBe("pickup_only");
  });

  it("locks storefront to /s/[storeSlug] aligned with ADR-091", () => {
    expect(STOREFRONT_PARAM).toBe("storeSlug");
    expect(URL_PATHS.storefrontPattern).toBe("/s/[storeSlug]");
    expect(URL_PATHS.storefrontPrefix).toBe(STOREFRONT_URL.prefix);
    expect(storefrontAppPath("atina-kerman")).toBe(
      buildStorefrontPath("atina-kerman"),
    );
    expect(storefrontAppPath("atina-kerman")).toBe("/s/atina-kerman");
    expect(() => assertStorefrontParamName("storeSlug")).not.toThrow();
    expect(() => assertStorefrontParamName("slug")).toThrow(/storeSlug/);
  });

  it("forbids delivery/courier URL segments", () => {
    expect(FORBIDDEN_URL_SEGMENTS).toEqual(
      expect.arrayContaining(["delivery", "courier", "shipping", "rider"]),
    );
    expect(isForbiddenUrlSegment("delivery")).toBe(true);
    expect(isForbiddenUrlSegment("pickup")).toBe(false);
    expect(() => assertNoForbiddenUrlSegment("delivery")).toThrow(/forbidden/i);
    expect(() => assertNoForbiddenUrlSegment("dashboard")).not.toThrow();
  });

  it("scaffolds route-group pages on disk", () => {
    const root = process.cwd();
    expect(APP_STRUCTURE.rootPage).toBe(APP_ROUTER_FILESYSTEM.marketing.page);
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.rootLayout))).toBe(true);
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.marketing.page))).toBe(
      true,
    );
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.marketing.layout))).toBe(
      true,
    );
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.merchant.dashboardPage)),
    ).toBe(true);
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.merchant.posPage))).toBe(
      true,
    );
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.merchant.manifestRoute)),
    ).toBe(true);
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.merchant.installPrompt)),
    ).toBe(true);
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.merchant.layout))).toBe(
      true,
    );
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.storePage))).toBe(
      true,
    );
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.catalogPage))).toBe(
      true,
    );
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.aboutPage))).toBe(
      true,
    );
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.manifestRoute)),
    ).toBe(true);
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.installPrompt)),
    ).toBe(true);
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.dashboardPage)),
    ).toBe(true);
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.dashboardOrdersPage)),
    ).toBe(true);
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.dashboardWalletPage)),
    ).toBe(true);
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.storefront.layout))).toBe(
      true,
    );
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.admin.page))).toBe(true);
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.admin.merchantsPage)),
    ).toBe(true);
    expect(
      existsSync(join(root, APP_ROUTER_FILESYSTEM.admin.securityPage)),
    ).toBe(true);
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.admin.auditPage))).toBe(
      true,
    );
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.admin.layout))).toBe(true);
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.apiV1Dir))).toBe(true);
    expect(existsSync(join(root, APP_ROUTER_FILESYSTEM.middlewareFile))).toBe(
      true,
    );
    // Marketing moved off flat app/page.tsx
    expect(existsSync(join(root, "app/page.tsx"))).toBe(false);
  });

  it("keeps Persian RTL defaults and Persian placeholder shells", () => {
    const root = process.cwd();
    const layout = readFileSync(join(root, APP_ROUTER_FILESYSTEM.rootLayout), "utf8");
    expect(layout).toMatch(/lang=["']fa["']/);
    expect(layout).toMatch(/dir=["']rtl["']/);

    const marketing = readFileSync(
      join(root, APP_ROUTER_FILESYSTEM.marketing.page),
      "utf8",
    );
    expect(marketing).toMatch(/کاسبینو/);

    const storefront = readFileSync(
      join(root, APP_ROUTER_FILESYSTEM.storefront.storePage),
      "utf8",
    );
    expect(storefront).toMatch(/ویترین|فروشگاه/);
    expect(storefront).toMatch(/storeSlug/);

    const merchant = readFileSync(
      join(root, APP_ROUTER_FILESYSTEM.merchant.dashboardPage),
      "utf8",
    );
    expect(merchant).toMatch(/[\u0600-\u06FF]/);

    const admin = readFileSync(join(root, APP_ROUTER_FILESYSTEM.admin.page), "utf8");
    expect(admin).toMatch(/[\u0600-\u06FF]/);
  });

  it("has no forbidden delivery path segments under app/", () => {
    const appDir = join(process.cwd(), "app");
    const dirs = walkDirs(appDir);
    for (const name of FORBIDDEN_URL_SEGMENTS) {
      expect(dirs).not.toContain(name);
    }
  });

  it("classifies pathnames for coarse middleware audiences", () => {
    expect(classifyRouteAudience("/")).toBe("marketing");
    expect(classifyRouteAudience("/dashboard")).toBe("merchant");
    expect(classifyRouteAudience("/pos")).toBe("merchant");
    expect(classifyRouteAudience("/staff/manifest.webmanifest")).toBe("merchant");
    expect(classifyRouteAudience("/s/atina-kerman")).toBe("storefront");
    expect(classifyRouteAudience("/admin")).toBe("admin");
    expect(classifyRouteAudience("/api/v1/merchants")).toBe("api");
    expect(ROUTE_AUDIENCE_HEADER).toBe("x-mos-route-audience");
    expect(MIDDLEWARE_GATES.merchant.authIntent).toBe("merchant_session");
    expect(MIDDLEWARE_GATES.admin.authIntent).toBe("platform_admin");

    // Edge middleware is self-contained (no NodeNext .js imports) — stay aligned
    const middlewareSrc = readFileSync(
      join(process.cwd(), APP_ROUTER_FILESYSTEM.middlewareFile),
      "utf8",
    );
    expect(middlewareSrc).toContain(ROUTE_AUDIENCE_HEADER);
    expect(middlewareSrc).toContain('"/dashboard"');
    expect(middlewareSrc).toContain('"/staff"');
    expect(middlewareSrc).toContain('"/s/"');
    expect(middlewareSrc).toContain('"/admin"');
    expect(middlewareSrc).toContain('"/api/v1"');
  });
});
