import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CUSTOMER_JWT_CLAIMS_CONTRACT } from "../../../customer-identity/domain/auth/index.js";
import {
  STORE_CUSTOMER_DEFAULT_THEME_COLOR,
  STORE_CUSTOMER_MANIFEST_CONTENT_TYPE,
  STORE_CUSTOMER_PWA,
  STORE_CUSTOMER_PWA_APP_PATHS,
  STORE_CUSTOMER_PWA_AUDIENCE,
  STORE_CUSTOMER_PWA_COPY_FA,
  STORE_CUSTOMER_PWA_DECISION,
  STORE_CUSTOMER_PWA_EVENTS,
  STORE_CUSTOMER_PWA_INSTALL_UX,
  STORE_CUSTOMER_PWA_OFFLINE,
  STORE_CUSTOMER_PWA_PATHS,
  STORE_CUSTOMER_PWA_UIUX_GATE,
  assertCustomerJwtOnlyForStorePwa,
  assertManifestDoesNotCollideWithStaff,
  assertNotStaffPwaAudience,
  assertStoreCustomerPwaBranding,
  assertStoreCustomerPwaUiuxGate,
  buildStoreCustomerManifest,
  storeCustomerManifestPath,
  storeCustomerScope,
  storeCustomerStartUrl,
} from "./index.js";

describe("ADR-023 Store Customer PWA Architecture", () => {
  it("locks per-store installable PWA with storefront start_url", () => {
    expect(STORE_CUSTOMER_PWA_DECISION.perStoreInstallable).toBe(true);
    expect(STORE_CUSTOMER_PWA_DECISION.startUrlTarget).toBe("storefront");
    expect(STORE_CUSTOMER_PWA_DECISION.globalConsumerApp).toBe(false);
    expect(storeCustomerStartUrl("atina-kerman")).toBe("/s/atina-kerman");
    expect(storeCustomerScope("atina-kerman")).toBe("/s/atina-kerman/");
    expect(storeCustomerManifestPath("atina-kerman")).toBe(
      "/s/atina-kerman/manifest.webmanifest",
    );
    expect(STORE_CUSTOMER_PWA_PATHS.manifestSegment).toBe(
      "manifest.webmanifest",
    );
    expect(STORE_CUSTOMER_PWA_PATHS.pwaMetaApiPattern).toContain("pwa-meta");
  });

  it("isolates audience from staff PWA (ADR-022)", () => {
    expect(STORE_CUSTOMER_PWA_AUDIENCE.id).toBe("store-customer");
    expect(STORE_CUSTOMER_PWA_AUDIENCE.forbiddenAudience).toBe("staff");
    expect(STORE_CUSTOMER_PWA_AUDIENCE.staffPwaAdr).toBe("ADR-022");
    expect(STORE_CUSTOMER_PWA_AUDIENCE.authRole).toBe(
      CUSTOMER_JWT_CLAIMS_CONTRACT.role,
    );
    expect(() => assertNotStaffPwaAudience("store-customer")).not.toThrow();
    expect(() => assertNotStaffPwaAudience("staff")).toThrow(/staff/i);
    expect(() =>
      assertManifestDoesNotCollideWithStaff(
        "/s/atina-kerman/manifest.webmanifest",
      ),
    ).not.toThrow();
    expect(() =>
      assertManifestDoesNotCollideWithStaff(
        STORE_CUSTOMER_PWA_AUDIENCE.staffManifestPathReserved,
      ),
    ).toThrow(/staff/i);
    expect(() => assertManifestDoesNotCollideWithStaff("/pos")).toThrow(
      /staff|POS/i,
    );
  });

  it("accepts customer JWT only", () => {
    expect(() => assertCustomerJwtOnlyForStorePwa("customer")).not.toThrow();
    expect(() => assertCustomerJwtOnlyForStorePwa("owner")).toThrow(
      /customer/i,
    );
    expect(() => assertCustomerJwtOnlyForStorePwa("cashier")).toThrow(
      /customer/i,
    );
  });

  it("builds branded Persian RTL manifest with storefront start_url", () => {
    const manifest = buildStoreCustomerManifest("atina-kerman", {
      displayName: "آتینا کرمان",
      primaryColor: "#0d9488",
    });
    expect(manifest.lang).toBe("fa");
    expect(manifest.dir).toBe("rtl");
    expect(manifest.display).toBe("standalone");
    expect(manifest.name).toBe("آتینا کرمان");
    expect(manifest.start_url).toBe("/s/atina-kerman");
    expect(manifest.scope).toBe("/s/atina-kerman/");
    expect(manifest.theme_color).toBe("#0d9488");
    expect(manifest.description).toMatch(/پیکاپ|حضوری/);
    expect(manifest.icons[0]?.src).toContain("store-customer-pwa-default");
    expect(STORE_CUSTOMER_MANIFEST_CONTENT_TYPE).toMatch(/manifest/);
    expect(
      buildStoreCustomerManifest("x", { displayName: "مغازه" }).theme_color,
    ).toBe(STORE_CUSTOMER_DEFAULT_THEME_COLOR);
    expect(() =>
      assertStoreCustomerPwaBranding({ displayName: "  " }),
    ).toThrow(/displayName/i);
  });

  it("documents offline read-mostly catalog note and install events", () => {
    expect(STORE_CUSTOMER_PWA_OFFLINE.mode).toBe("online_first");
    expect(STORE_CUSTOMER_PWA_OFFLINE.catalog).toBe("read_mostly_stretch");
    expect(STORE_CUSTOMER_PWA_OFFLINE.authRequiresNetwork).toBe(true);
    expect(STORE_CUSTOMER_PWA_OFFLINE.ordersRequireNetwork).toBe(true);
    expect(STORE_CUSTOMER_PWA_OFFLINE.noteFa).toMatch(/کاتالوگ|آفلاین/);
    expect(STORE_CUSTOMER_PWA_OFFLINE.serviceWorker).toBe(
      "/sw-store-customer.js",
    );
    expect(STORE_CUSTOMER_PWA_OFFLINE.sharedWithStaffForbidden).toBe(true);
    expect(STORE_CUSTOMER_PWA_COPY_FA.iosHint).toMatch(/سافاری|صفحهٔ اصلی/);
    expect(STORE_CUSTOMER_PWA_EVENTS.installPromptShown).toBe(
      "StorePwaInstallPromptShown",
    );
    expect(STORE_CUSTOMER_PWA_EVENTS.installed).toBe("StorePwaInstalled");
    expect(STORE_CUSTOMER_PWA_EVENTS.appOpenedSource).toBe("store-pwa");
  });

  it("provides Persian install UX with mobile touch targets", () => {
    expect(STORE_CUSTOMER_PWA_INSTALL_UX.lang).toBe("fa");
    expect(STORE_CUSTOMER_PWA_INSTALL_UX.dir).toBe("rtl");
    expect(STORE_CUSTOMER_PWA_INSTALL_UX.minTouchTargetPx).toBeGreaterThanOrEqual(
      44,
    );
    expect(STORE_CUSTOMER_PWA_COPY_FA.bannerTitle).toMatch(/نصب|اپلیکیشن|فروشگاه/);
    expect(STORE_CUSTOMER_PWA_COPY_FA.installCta).toMatch(/صفحهٔ اصلی|افزودن/);
    expect(STORE_CUSTOMER_PWA_COPY_FA.dismissCta).toMatch(/الان نه/);
    expect(STORE_CUSTOMER_PWA_COPY_FA.installed).toMatch(/دستگاه/);
    expect(STORE_CUSTOMER_PWA.copyFa.bannerBody).toMatch(/سفارش|امتیاز/);
  });

  it("passes uiuxpromax gate and scaffolds manifest route + install prompt", () => {
    expect(STORE_CUSTOMER_PWA_UIUX_GATE.gatePassed).toBe(true);
    expect(STORE_CUSTOMER_PWA_UIUX_GATE.brief.persian).toBe(true);
    expect(STORE_CUSTOMER_PWA_UIUX_GATE.brief.rtl).toBe(true);
    expect(() => assertStoreCustomerPwaUiuxGate()).not.toThrow();

    const root = process.cwd();
    for (const rel of [
      STORE_CUSTOMER_PWA_APP_PATHS.manifestRoute,
      STORE_CUSTOMER_PWA_APP_PATHS.installPrompt,
      STORE_CUSTOMER_PWA_APP_PATHS.storeHome,
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }

    const route = readFileSync(
      join(root, STORE_CUSTOMER_PWA_APP_PATHS.manifestRoute),
      "utf8",
    );
    const prompt = readFileSync(
      join(root, STORE_CUSTOMER_PWA_APP_PATHS.installPrompt),
      "utf8",
    );
    const home = readFileSync(
      join(root, STORE_CUSTOMER_PWA_APP_PATHS.storeHome),
      "utf8",
    );

    expect(route).toMatch(/buildStoreCustomerManifest|manifest/);
    expect(route).toMatch(/STORE_CUSTOMER_MANIFEST_CONTENT_TYPE|Content-Type/);
    expect(prompt).toMatch(/نصب اپلیکیشن فروشگاه|افزودن به صفحهٔ اصلی/);
    expect(prompt).toMatch(/use client/);
    expect(home).toMatch(/InstallPrompt|install-prompt/);
    expect(home).toMatch(/manifest\.webmanifest/);
    expect(STORE_CUSTOMER_PWA.decision.adr).toBe("ADR-023");
  });
});
