import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const PUBLIC_ROUTES = [
  { path: "/", name: "marketing" },
  { path: "/login", name: "merchant-login" },
  { path: "/ui-kit", name: "ui-kit" },
  { path: "/admin", name: "admin-hub" },
  { path: "/admin/merchants", name: "admin-merchants" },
  { path: "/admin/security", name: "admin-security" },
  { path: "/admin/audit", name: "admin-audit" },
] as const;

const STORE_SLUG = process.env.E2E_STORE_SLUG ?? "";

function shotDir(): string {
  const dir = path.join(
    process.cwd(),
    "docs",
    "uiux",
    "audits",
    "2026-08-06",
    "after",
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function assertNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const maxScroll = root.scrollWidth - root.clientWidth;
    const offenders: string[] = [];
    if (maxScroll > 1) {
      for (const node of document.body.querySelectorAll("*")) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.closest("nextjs-portal")) continue;
        const rect = node.getBoundingClientRect();
        if (rect.right > root.clientWidth + 1 || rect.left < -1) {
          offenders.push(
            `${node.tagName}:${(node.className || "").toString().slice(0, 48)} L${Math.round(rect.left)} R${Math.round(rect.right)}`,
          );
        }
      }
    }
    return {
      maxScroll,
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      offenders: offenders.slice(0, 12),
    };
  });

  expect(
    result.maxScroll,
    `horizontal overflow maxScroll=${result.maxScroll} (${result.scrollWidth}/${result.clientWidth}) offenders=${result.offenders.join(" | ")}`,
  ).toBeLessThanOrEqual(1);
}

test.describe("ADR-125 public route UI audit", () => {
  for (const route of PUBLIC_ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route.name} @ ${vp.name}`, async ({ page }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (err) => {
          pageErrors.push(String(err));
        });

        await page.setViewportSize({ width: vp.width, height: vp.height });
        const response = await page.goto(route.path, {
          waitUntil: "domcontentloaded",
        });
        expect(response, "navigation response").toBeTruthy();
        expect(response!.status()).toBeLessThan(500);

        await page.waitForTimeout(400);
        await assertNoHorizontalOverflow(page);

        await page.screenshot({
          path: path.join(shotDir(), `${route.name}-${vp.name}.png`),
          fullPage: true,
        });

        expect(pageErrors, `pageerrors on ${route.path}`).toEqual([]);
      });
    }
  }
});

test.describe("ADR-125 storefront routes (optional slug)", () => {
  test.skip(!STORE_SLUG, "Set E2E_STORE_SLUG to audit storefront");

  const storeRoutes = [
    "",
    "/catalog",
    "/about",
    "/login",
    "/checkout",
    "/dashboard",
  ];

  for (const suffix of storeRoutes) {
    test(`store ${suffix || "/"} @ mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const url = `/s/${STORE_SLUG}${suffix}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded" });
      expect(response!.status()).toBeLessThan(500);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(
          shotDir(),
          `store-${suffix.replaceAll("/", "-") || "home"}-mobile.png`,
        ),
        fullPage: true,
      });
    });
  }
});

test.describe("ADR-125 gated merchant (optional storage)", () => {
  const state = process.env.E2E_STORAGE_STATE;
  test.skip(!state, "Set E2E_STORAGE_STATE for authenticated merchant audit");

  test.use({ storageState: state });

  const merchantRoutes = [
    "/dashboard",
    "/products",
    "/inventory",
    "/customers",
    "/orders",
    "/loyalty",
    "/notifications",
    "/stores",
    "/pos",
  ];

  for (const route of merchantRoutes) {
    test(`merchant ${route} @ desktop`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response!.status()).toBeLessThan(500);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(
          shotDir(),
          `merchant-${route.replaceAll("/", "-").slice(1)}-desktop.png`,
        ),
        fullPage: true,
      });
    });
  }
});
