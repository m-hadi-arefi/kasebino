import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MERCHANT_AUTH_DECISION } from "../merchant-auth/index.js";
import {
  STAFF_DEFAULT_THEME_COLOR,
  STAFF_MANIFEST_CONTENT_TYPE,
  STAFF_PWA,
  STAFF_PWA_APP_PATHS,
  STAFF_PWA_AUDIENCE,
  STAFF_PWA_BRANDING,
  STAFF_PWA_COOKIE_ISOLATION,
  STAFF_PWA_COPY_FA,
  STAFF_PWA_DECISION,
  STAFF_PWA_EVENTS,
  STAFF_PWA_INSTALL_UX,
  STAFF_PWA_OFFLINE,
  STAFF_PWA_PATHS,
  STAFF_PWA_UIUX_GATE,
  assertManifestDoesNotCollideWithStoreCustomer,
  assertMerchantStaffJwtOnly,
  assertNotStoreCustomerPwaAudience,
  assertStaffPwaUiuxGate,
  buildStaffManifest,
  staffManifestPath,
  staffScope,
  staffStartUrl,
} from "./index.js";

describe("ADR-022 Merchant Staff PWA Architecture", () => {
  it("locks installable staff PWA with POS start_url and MerchantOS branding", () => {
    expect(STAFF_PWA_DECISION.installable).toBe(true);
    expect(STAFF_PWA_DECISION.startUrlTarget).toBe("pos");
    expect(STAFF_PWA_DECISION.brandingSource).toBe("merchantos");
    expect(STAFF_PWA_DECISION.sharedWithStoreCustomerPwa).toBe(false);
    expect(STAFF_PWA_DECISION.offlineQueueAdr).toBe("ADR-024");
    expect(staffStartUrl()).toBe("/pos");
    expect(staffScope()).toBe("/");
    expect(staffManifestPath()).toBe("/staff/manifest.webmanifest");
    expect(STAFF_PWA_PATHS.manifestPath).toBe("/staff/manifest.webmanifest");
    expect(STAFF_PWA_BRANDING.name).toMatch(/کاسبینو|صندوق/);
  });

  it("isolates audience from store customer PWA (ADR-023)", () => {
    expect(STAFF_PWA_AUDIENCE.id).toBe("staff");
    expect(STAFF_PWA_AUDIENCE.forbiddenAudience).toBe("store-customer");
    expect(STAFF_PWA_AUDIENCE.storeCustomerPwaAdr).toBe("ADR-023");
    expect(STAFF_PWA_AUDIENCE.authAudience).toBe(
      MERCHANT_AUTH_DECISION.audience,
    );
    expect(() => assertNotStoreCustomerPwaAudience("staff")).not.toThrow();
    expect(() => assertNotStoreCustomerPwaAudience("store-customer")).toThrow(
      /store-customer|ADR-023/i,
    );
    expect(() =>
      assertManifestDoesNotCollideWithStoreCustomer(
        "/staff/manifest.webmanifest",
      ),
    ).not.toThrow();
    expect(() =>
      assertManifestDoesNotCollideWithStoreCustomer(
        "/s/atina-kerman/manifest.webmanifest",
      ),
    ).toThrow(/store customer|ADR-023/i);
  });

  it("accepts merchant staff JWT roles only", () => {
    expect(() => assertMerchantStaffJwtOnly("merchant_owner")).not.toThrow();
    expect(() => assertMerchantStaffJwtOnly("store_employee")).not.toThrow();
    expect(() => assertMerchantStaffJwtOnly("customer")).toThrow(/customer/i);
    expect(() => assertMerchantStaffJwtOnly("platform_admin")).toThrow(
      /merchant staff/i,
    );
  });

  it("builds Persian RTL MerchantOS manifest with POS start_url", () => {
    const manifest = buildStaffManifest();
    expect(manifest.lang).toBe("fa");
    expect(manifest.dir).toBe("rtl");
    expect(manifest.display).toBe("standalone");
    expect(manifest.name).toBe(STAFF_PWA_BRANDING.name);
    expect(manifest.short_name).toBe(STAFF_PWA_BRANDING.shortName);
    expect(manifest.start_url).toBe("/pos");
    expect(manifest.scope).toBe("/");
    expect(manifest.theme_color).toBe(STAFF_DEFAULT_THEME_COLOR);
    expect(manifest.description).toMatch(/فروش|پرسنل|کاسبینو/);
    expect(manifest.icons[0]?.src).toContain("staff-pwa-default");
    expect(STAFF_MANIFEST_CONTENT_TYPE).toMatch(/manifest/);
  });

  it("documents online-first offline queue via ADR-024 and staff-pwa events", () => {
    expect(STAFF_PWA_OFFLINE.mode).toBe("online_first_with_offline_queue_p1");
    expect(STAFF_PWA_OFFLINE.saleQueue).toBe("pos_offline");
    expect(STAFF_PWA_OFFLINE.serviceWorker).toBe("/sw-staff.js");
    expect(STAFF_PWA_OFFLINE.offlinePackage).toBe("src/pos-offline");
    expect(STAFF_PWA_OFFLINE.offlineAdr).toBe("ADR-024");
    expect(STAFF_PWA_OFFLINE.bannerFa).toMatch(/آفلاین|اتصال/);
    expect(STAFF_PWA_OFFLINE.noteFa).toMatch(/ADR-024|آفلاین/);
    expect(STAFF_PWA_EVENTS.installPromptShown).toBe(
      "StaffPwaInstallPromptShown",
    );
    expect(STAFF_PWA_EVENTS.installed).toBe("StaffPwaInstalled");
    expect(STAFF_PWA_EVENTS.appOpenedSource).toBe("staff-pwa");
    expect(STAFF_PWA_COOKIE_ISOLATION.httpOnlyRequired).toBe(true);
    expect(STAFF_PWA_COOKIE_ISOLATION.neverShareWithCustomerStorePwa).toBe(
      true,
    );
  });

  it("provides Persian install UX with mobile touch targets", () => {
    expect(STAFF_PWA_INSTALL_UX.lang).toBe("fa");
    expect(STAFF_PWA_INSTALL_UX.dir).toBe("rtl");
    expect(STAFF_PWA_INSTALL_UX.minTouchTargetPx).toBeGreaterThanOrEqual(44);
    expect(STAFF_PWA_COPY_FA.bannerTitle).toMatch(/نصب|صندوق/);
    expect(STAFF_PWA_COPY_FA.installCta).toMatch(/صفحهٔ اصلی|افزودن/);
    expect(STAFF_PWA_COPY_FA.dismissCta).toMatch(/الان نه/);
    expect(STAFF_PWA_COPY_FA.installed).toMatch(/دستگاه/);
    expect(STAFF_PWA_COPY_FA.cashierHint).toMatch(/تومان|بارکد|موبایل/);
    expect(STAFF_PWA.copyFa.bannerBody).toMatch(/صندوق|کاسبینو/);
  });

  it("passes uiuxpromax gate and scaffolds manifest route + POS install chrome", () => {
    expect(STAFF_PWA_UIUX_GATE.gatePassed).toBe(true);
    expect(STAFF_PWA_UIUX_GATE.brief.persian).toBe(true);
    expect(STAFF_PWA_UIUX_GATE.brief.rtl).toBe(true);
    expect(() => assertStaffPwaUiuxGate()).not.toThrow();

    const root = process.cwd();
    for (const rel of [
      STAFF_PWA_APP_PATHS.manifestRoute,
      STAFF_PWA_APP_PATHS.installPrompt,
      STAFF_PWA_APP_PATHS.posPage,
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }

    const route = readFileSync(
      join(root, STAFF_PWA_APP_PATHS.manifestRoute),
      "utf8",
    );
    const prompt = readFileSync(
      join(root, STAFF_PWA_APP_PATHS.installPrompt),
      "utf8",
    );
    const pos = readFileSync(join(root, STAFF_PWA_APP_PATHS.posPage), "utf8");

    expect(route).toMatch(/buildStaffManifest|STAFF_MANIFEST/);
    expect(route).toMatch(/Content-Type|STAFF_MANIFEST_CONTENT_TYPE/);
    expect(prompt).toMatch(/نصب اپلیکیشن صندوق|افزودن به صفحهٔ اصلی/);
    expect(prompt).toMatch(/use client/);
    expect(prompt).not.toMatch(/نصب اپلیکیشن فروشگاه/);
    expect(pos).toMatch(/StaffInstallPrompt|install-prompt/);
    expect(pos).toMatch(/staffManifestPath|manifest/);
    expect(STAFF_PWA.decision.adr).toBe("ADR-022");
  });
});
