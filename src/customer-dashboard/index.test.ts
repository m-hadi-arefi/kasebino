import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CACHE_TTL_SECONDS } from "../cache-keys/index.js";
import {
  CUSTOMER_DASHBOARD,
  CUSTOMER_DASHBOARD_API_PATHS,
  CUSTOMER_DASHBOARD_APP_PATHS,
  CUSTOMER_DASHBOARD_CACHE,
  CUSTOMER_DASHBOARD_COPY_FA,
  CUSTOMER_DASHBOARD_DECISION,
  CUSTOMER_DASHBOARD_EVENTS,
  CUSTOMER_DASHBOARD_SURFACES,
  CUSTOMER_DASHBOARD_UIUX_GATE,
  assertCustomerAudienceOnly,
  assertCustomerDashboardAuthRequired,
  assertCustomerDashboardRole,
  assertCustomerDashboardUiuxGate,
  assertMembershipScopedToStore,
  assertNoDeliveryOnCustomerDashboard,
  assertNoMerchantChromeOnCustomerDashboard,
  customerDashboardHomePath,
  customerDashboardOrdersPath,
  customerDashboardWalletPath,
} from "./index.js";

describe("ADR-087 Customer Dashboard Architecture", () => {
  it("locks store-membership scope with auth required and no cross-store leak", () => {
    expect(CUSTOMER_DASHBOARD_DECISION.adr).toBe("ADR-087");
    expect(CUSTOMER_DASHBOARD_DECISION.storeScoped).toBe(true);
    expect(CUSTOMER_DASHBOARD_DECISION.scope).toBe("store_membership");
    expect(CUSTOMER_DASHBOARD_DECISION.authRequired).toBe(true);
    expect(CUSTOMER_DASHBOARD_DECISION.authRole).toBe("customer");
    expect(CUSTOMER_DASHBOARD_DECISION.noCrossStoreLeak).toBe(true);
    expect(CUSTOMER_DASHBOARD_DECISION.noMerchantChrome).toBe(true);
    expect(CUSTOMER_DASHBOARD_DECISION.fulfillment).toBe("pickup_only");

    expect(() => assertCustomerDashboardAuthRequired(true)).not.toThrow();
    expect(() => assertCustomerDashboardAuthRequired(false)).toThrow(/auth|وارد/i);
    expect(() => assertCustomerDashboardRole("customer")).not.toThrow();
    expect(() => assertCustomerDashboardRole("owner")).toThrow(/customer/i);
    expect(() => assertCustomerAudienceOnly("customer")).not.toThrow();
    expect(() => assertCustomerAudienceOnly("merchant")).toThrow(/audience/i);

    expect(() =>
      assertMembershipScopedToStore({
        customerId: "c1",
        storeId: "store-a",
        membershipId: "m1",
        membershipStoreId: "store-a",
      }),
    ).not.toThrow();
    expect(() =>
      assertMembershipScopedToStore({
        customerId: "c1",
        storeId: "store-a",
        membershipId: "m1",
        membershipStoreId: "store-b",
      }),
    ).toThrow(/Cross-store/i);
  });

  it("documents ARD-035 API paths and analytics events", () => {
    expect(CUSTOMER_DASHBOARD_API_PATHS.me).toBe("/api/v1/customer/me");
    expect(CUSTOMER_DASHBOARD_API_PATHS.wallet).toContain(
      "/api/v1/customer/stores/:storeId/wallet",
    );
    expect(CUSTOMER_DASHBOARD_API_PATHS.history).toContain("/history");
    expect(CUSTOMER_DASHBOARD_API_PATHS.rewards).toContain("/rewards");
    expect(CUSTOMER_DASHBOARD_API_PATHS.receipt).toContain("/receipts/");
    expect(CUSTOMER_DASHBOARD_EVENTS.walletViewed).toBe("LoyaltyWalletViewed");
    expect(CUSTOMER_DASHBOARD_EVENTS.receiptViewed).toBe("ReceiptViewed");
  });

  it("uses wallet/history cache TTL within 60–300s band", () => {
    expect(CUSTOMER_DASHBOARD_CACHE.walletTtlSeconds).toBe(CACHE_TTL_SECONDS.hotEntity);
    expect(CUSTOMER_DASHBOARD_CACHE.walletTtlSeconds).toBeGreaterThanOrEqual(60);
    expect(CUSTOMER_DASHBOARD_CACHE.walletTtlSeconds).toBeLessThanOrEqual(300);
    expect(CUSTOMER_DASHBOARD_CACHE.historyTtlMinSeconds).toBe(60);
    expect(CUSTOMER_DASHBOARD_CACHE.historyTtlMaxSeconds).toBe(300);
    expect(CUSTOMER_DASHBOARD_CACHE.neverSourceOfTruth).toBe(true);
  });

  it("forbids merchant chrome and delivery features", () => {
    expect(() => assertNoMerchantChromeOnCustomerDashboard("catalog")).not.toThrow();
    expect(() => assertNoMerchantChromeOnCustomerDashboard("staff")).toThrow(/ADR-022|chrome/i);
    expect(() => assertNoMerchantChromeOnCustomerDashboard("pos")).toThrow(/chrome/i);
    expect(() => assertNoDeliveryOnCustomerDashboard("pickup")).not.toThrow();
    expect(() => assertNoDeliveryOnCustomerDashboard("delivery")).toThrow(/delivery/i);
  });

  it("exposes Persian copy with تومان and Jalali notes", () => {
    expect(CUSTOMER_DASHBOARD_SURFACES.home.titleFa).toMatch(/پنل/);
    expect(CUSTOMER_DASHBOARD_SURFACES.orders.titleFa).toMatch(/سفارش/);
    expect(CUSTOMER_DASHBOARD_SURFACES.wallet.titleFa).toMatch(/امتیاز|کیف/);
    expect(CUSTOMER_DASHBOARD_COPY_FA.priceUnit).toBe("تومان");
    expect(CUSTOMER_DASHBOARD_COPY_FA.moneyHint).toMatch(/تومان/);
    expect(CUSTOMER_DASHBOARD_COPY_FA.jalaliHint).toMatch(/شمسی|جلالی|تهران/);
    expect(CUSTOMER_DASHBOARD_COPY_FA.authRequired).toMatch(/وارد/);
    expect(CUSTOMER_DASHBOARD_COPY_FA.ordersEmpty).toMatch(/سفارش/);
    expect(CUSTOMER_DASHBOARD_COPY_FA.walletEmpty).toMatch(/امتیاز/);
    expect(CUSTOMER_DASHBOARD_COPY_FA.membershipScopedHint).toMatch(/مغازه|عضویت/);
  });

  it("builds dashboard paths under storefront /s/{storeSlug}", () => {
    expect(customerDashboardHomePath("atina-kerman")).toBe(
      "/s/atina-kerman/dashboard",
    );
    expect(customerDashboardOrdersPath("atina-kerman")).toBe(
      "/s/atina-kerman/dashboard/orders",
    );
    expect(customerDashboardWalletPath("atina-kerman")).toBe(
      "/s/atina-kerman/dashboard/wallet",
    );
  });

  it("scaffolds Persian RTL dashboard, orders, and wallet routes", () => {
    const root = process.cwd();
    for (const rel of [
      CUSTOMER_DASHBOARD_APP_PATHS.homePage,
      CUSTOMER_DASHBOARD_APP_PATHS.ordersPage,
      CUSTOMER_DASHBOARD_APP_PATHS.walletPage,
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }

    const home = readFileSync(
      join(root, CUSTOMER_DASHBOARD_APP_PATHS.homePage),
      "utf8",
    );
    const orders = readFileSync(
      join(root, CUSTOMER_DASHBOARD_APP_PATHS.ordersPage),
      "utf8",
    );
    const wallet = readFileSync(
      join(root, CUSTOMER_DASHBOARD_APP_PATHS.walletPage),
      "utf8",
    );

    expect(home).toMatch(/پنل من|داشبورد/);
    expect(home).toMatch(/وارد شوید|ورود/);
    expect(home).toMatch(/تومان/);
    expect(home).toMatch(/شمسی|جلالی|تهران/);
    expect(home).toMatch(/orders|سفارش/);
    expect(home).toMatch(/wallet|امتیاز/);
    expect(home).not.toMatch(/delivery|courier/i);
    expect(orders).toMatch(/سفارش/);
    expect(orders).toMatch(/هنوز سفارشی|سفارشی ندارید/);
    expect(orders).toMatch(/پیکاپ|حضوری/);
    expect(wallet).toMatch(/امتیاز|کیف/);
    expect(wallet).toMatch(/تومان|امتیاز/);
    expect(wallet).toMatch(/شمسی|جلالی|تهران/);
  });

  it("passes uiuxpromax gate with Persian RTL mobile customer brief", () => {
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.brief.persian).toBe(true);
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.brief.rtl).toBe(true);
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.brief.mobile390).toBe(true);
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.brief.iranianRetailContext).toBe(true);
    expect(() => assertCustomerDashboardUiuxGate()).not.toThrow();
    expect(CUSTOMER_DASHBOARD.decision.adr).toBe("ADR-087");
  });
});
