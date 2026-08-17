import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CACHE_TTL_SECONDS } from "../../../../infrastructure/redis/cache-keys/index.js";
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

  it("documents ADR-103 storefront me API paths and analytics events", () => {
    expect(CUSTOMER_DASHBOARD_API_PATHS.me).toBe(
      "/api/v1/storefront/:slug/me",
    );
    expect(CUSTOMER_DASHBOARD_API_PATHS.wallet).toContain(
      "/api/v1/storefront/:slug/wallet",
    );
    expect(CUSTOMER_DASHBOARD_API_PATHS.history).toContain("/me/history");
    expect(CUSTOMER_DASHBOARD_API_PATHS.rewards).toContain("/me/rewards");
    expect(CUSTOMER_DASHBOARD_API_PATHS.receipts).toContain("/me/receipts");
    expect(CUSTOMER_DASHBOARD_API_PATHS.logout).toBe(
      "/api/v1/customer/auth/logout",
    );
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

  it("scaffolds Persian RTL portal routes including rewards and receipts", () => {
    const root = process.cwd();
    for (const rel of [
      CUSTOMER_DASHBOARD_APP_PATHS.homePage,
      CUSTOMER_DASHBOARD_APP_PATHS.ordersPage,
      CUSTOMER_DASHBOARD_APP_PATHS.walletPage,
      CUSTOMER_DASHBOARD_APP_PATHS.rewardsPage,
      CUSTOMER_DASHBOARD_APP_PATHS.receiptsPage,
      CUSTOMER_DASHBOARD_APP_PATHS.loginPage,
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }

    const homeClient = readFileSync(
      join(
        root,
        "app/(storefront)/s/[storeSlug]/dashboard/portal-home-client.tsx",
      ),
      "utf8",
    );
    const ordersClient = readFileSync(
      join(
        root,
        "app/(storefront)/s/[storeSlug]/dashboard/orders/orders-client.tsx",
      ),
      "utf8",
    );
    const wallet = readFileSync(
      join(root, CUSTOMER_DASHBOARD_APP_PATHS.walletPage),
      "utf8",
    );
    const login = readFileSync(
      join(
        root,
        "app/(storefront)/s/[storeSlug]/login/customer-otp-login-form.tsx",
      ),
      "utf8",
    );

    expect(homeClient).toMatch(/پنل من|homeTitle/);
    expect(homeClient).toMatch(/logout|خروج/);
    expect(homeClient).toMatch(/تومان|priceUnit|moneyHint/);
    expect(homeClient).toMatch(/شمسی|جلالی|تهران|jalaliHint/);
    expect(homeClient).toMatch(/StatCard|PageHeader|StorefrontChrome|membershipScopedHint/);
    expect(homeClient).not.toMatch(/delivery|courier/i);

    const chrome = readFileSync(
      join(root, "src/components/layout/storefront-chrome.tsx"),
      "utf8",
    );
    expect(chrome).toMatch(/orders|سفارش|dashboard\/orders/);
    expect(chrome).toMatch(/wallet|کیف|dashboard\/wallet/);
    expect(ordersClient).toMatch(/سفارش|ordersTitle/);
    expect(ordersClient).toMatch(/ordersEmpty|هنوز سفارشی|سفارشی ندارید/);
    expect(ordersClient).toMatch(/پیکاپ|حضوری|pickupOnlyHint/);
    expect(wallet).toMatch(/امتیاز|کیف/);
    expect(wallet).toMatch(/تومان|امتیاز|شمسی|جلالی|تهران/);
    expect(login).toMatch(/consentCheckboxAccepted|consentLabel/);
    expect(login).toMatch(/auth\/customer\/otp/);
  });

  it("passes uiuxpromax gate with Persian RTL mobile customer brief", () => {
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.brief.persian).toBe(true);
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.brief.rtl).toBe(true);
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.brief.mobile390).toBe(true);
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.brief.iranianRetailContext).toBe(true);
    expect(CUSTOMER_DASHBOARD_UIUX_GATE.briefPath).toBe(
      "docs/execution/plans/ADR-103.md",
    );
    expect(() => assertCustomerDashboardUiuxGate()).not.toThrow();
    expect(CUSTOMER_DASHBOARD.decision.adr).toBe("ADR-087");
  });
});
