import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wide", width: 1440, height: 900 },
] as const;

async function assertShellNoOverlap(page: Page, vpName: string) {
  const result = await page.evaluate(() => {
    const main = document.querySelector(
      '[data-testid="shell-main-content"]',
    ) as HTMLElement | null;
    const topbar = document.querySelector("header") as HTMLElement | null;
    const sidebarFixed = document.querySelector(
      '[data-sidebar="sidebar"]',
    )?.parentElement as HTMLElement | null;
    const peerGap = document.querySelector(
      ".group.peer > div.relative",
    ) as HTMLElement | null;

    if (!main) {
      return { ok: false, reason: "missing main content" };
    }

    const mainRect = main.getBoundingClientRect();
    const topRect = topbar?.getBoundingClientRect();
    const sideRect = sidebarFixed?.getBoundingClientRect();
    const gapWidth = peerGap?.getBoundingClientRect().width ?? 0;
    const isDesktopSidebar =
      sidebarFixed &&
      getComputedStyle(sidebarFixed).position === "fixed" &&
      getComputedStyle(sidebarFixed).display !== "none" &&
      (sideRect?.width ?? 0) > 40;

    const issues: string[] = [];

    if (topRect && mainRect.top < topRect.bottom - 1) {
      issues.push(
        `main under topbar (main.top=${mainRect.top.toFixed(1)} topbar.bottom=${topRect.bottom.toFixed(1)})`,
      );
    }

    if (isDesktopSidebar && sideRect) {
      // RTL: sidebar on the right — main must end left of sidebar's left edge
      if (mainRect.right > sideRect.left + 1) {
        issues.push(
          `main overlaps sidebar (main.right=${mainRect.right.toFixed(1)} sidebar.left=${sideRect.left.toFixed(1)})`,
        );
      }
      if (gapWidth < 40) {
        issues.push(`sidebar gap too small (${gapWidth.toFixed(1)}px)`);
      }
    }

    return {
      ok: issues.length === 0,
      reason: issues.join(" | ") || "ok",
      gapWidth,
      isDesktopSidebar: Boolean(isDesktopSidebar),
      mainRight: mainRect.right,
      sidebarLeft: sideRect?.left ?? null,
    };
  });

  expect(result.ok, `${vpName}: ${result.reason}`).toBe(true);
}

test.describe("merchant shell layout overlap", () => {
  for (const vp of VIEWPORTS) {
    test(`no overlap @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto("/ui-kit/shell", {
        waitUntil: "networkidle",
      });
      expect(res?.status()).toBeLessThan(500);
      await page.waitForSelector('[data-testid="shell-main-content"]');
      await page.waitForTimeout(300);
      await assertShellNoOverlap(page, vp.name);
    });
  }
});
