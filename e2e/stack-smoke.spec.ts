import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for local stack on remapped ports (APP :3020).
 */
test.describe("local stack smoke", () => {
  test("health probe is ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok" });
  });

  test("ready probe responds", async ({ request }) => {
    const res = await request.get("/api/ready");
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  test("marketing home loads RTL", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page.locator("html")).toHaveAttribute("lang", "fa");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("merchant login page is usable", async ({ page }) => {
    const res = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(res!.status()).toBeLessThan(500);
    await expect(page.getByPlaceholder("09123456789")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: /دریافت کد/ })).toBeVisible();
    await expect(page.locator("body")).toContainText(/ورود فروشنده|شماره موبایل/);
  });

  test("dashboard redirects unauthenticated users to login", async ({
    page,
  }) => {
    const res = await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
    });
    expect(res).toBeTruthy();
    expect(res!.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/login/);
  });

  test("unavailable mock ops pages stay honest", async ({ page }) => {
    test.setTimeout(60_000);
    for (const path of [
      "/purchases",
      "/suppliers",
      "/treasury",
      "/reports",
    ]) {
      const res = await page.goto(path, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      expect(res, path).toBeTruthy();
      expect(res!.status(), path).toBeLessThan(500);
      // Unauthenticated middleware may bounce to login for some merchant routes.
      if (/login/.test(page.url())) {
        continue;
      }
      await expect(
        page.getByRole("heading", { name: /در دسترس نیست/ }),
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});
