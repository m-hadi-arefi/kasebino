/**
 * ADR-087 — Customer Dashboard Architecture.
 *
 * Store-scoped customer portal: profile, points, history, rewards, receipts.
 * Membership authZ only — no cross-store leak. Auth required (role=customer).
 * NEVER merchant staff chrome (ADR-022) or delivery workflows.
 */

import { CACHE_TTL_SECONDS } from "../../../../infrastructure/redis/cache-keys/index.js";
import {
  CUSTOMER_AUTH_DECISION,
  CUSTOMER_JWT_CLAIMS_CONTRACT,
  assertCustomerJwtRole,
} from "../../domain/auth/index.js";
import { LOYALTY_COPY_FA } from "../../../loyalty/domain/contracts/index.js";
import { buildStorefrontPath } from "../../../../shared/architecture/product/index.js";
import { assertUiuxGate } from "../../../../shared/contracts/uiuxpromax-gate/index.js";

/** Binding Decision (ADR-087). */
export const CUSTOMER_DASHBOARD_DECISION = {
  adr: "ADR-087",
  storeScoped: true,
  scope: "store_membership" as const,
  authRequired: true,
  authRole: CUSTOMER_JWT_CLAIMS_CONTRACT.role,
  noCrossStoreLeak: true,
  noMerchantChrome: true,
  surfaces: ["profile", "points", "history", "rewards", "receipts"] as const,
  fulfillment: "pickup_only" as const,
  rationale: "close_loyalty_growth_loops",
} as const;

/** Route segments under `/s/{storeSlug}/dashboard`. */
export const CUSTOMER_DASHBOARD_SURFACES = {
  home: {
    segment: "" as const,
    titleFa: "پنل من",
  },
  orders: {
    segment: "orders" as const,
    titleFa: "سفارش‌های من",
  },
  wallet: {
    segment: "wallet" as const,
    titleFa: "کیف امتیاز",
  },
  rewards: {
    segment: "rewards" as const,
    titleFa: "جایزه‌ها",
  },
  receipts: {
    segment: "receipts" as const,
    titleFa: "رسیدها",
  },
} as const;

export type CustomerDashboardSurfaceId = keyof typeof CUSTOMER_DASHBOARD_SURFACES;

/** ARD-035 / ADR-103 API contracts — storefront-scoped portal. */
export const CUSTOMER_DASHBOARD_API_PATHS = {
  me: "/api/v1/storefront/:slug/me",
  wallet: "/api/v1/storefront/:slug/wallet",
  meWallet: "/api/v1/storefront/:slug/me/wallet",
  orders: "/api/v1/storefront/:slug/me/orders",
  history: "/api/v1/storefront/:slug/me/history",
  rewards: "/api/v1/storefront/:slug/me/rewards",
  receipts: "/api/v1/storefront/:slug/me/receipts",
  logout: "/api/v1/customer/auth/logout",
  otpRequest: "/api/v1/auth/customer/otp/request",
  otpVerify: "/api/v1/auth/customer/otp/verify",
} as const;

/** App Router paths relative to repo root. */
export const CUSTOMER_DASHBOARD_APP_PATHS = {
  homePage: "app/(storefront)/s/[storeSlug]/dashboard/page.tsx",
  ordersPage: "app/(storefront)/s/[storeSlug]/dashboard/orders/page.tsx",
  walletPage: "app/(storefront)/s/[storeSlug]/dashboard/wallet/page.tsx",
  rewardsPage: "app/(storefront)/s/[storeSlug]/dashboard/rewards/page.tsx",
  receiptsPage: "app/(storefront)/s/[storeSlug]/dashboard/receipts/page.tsx",
  loginPage: "app/(storefront)/s/[storeSlug]/login/page.tsx",
} as const;

/** Cache notes for wallet/history read models (ARD-035). */
export const CUSTOMER_DASHBOARD_CACHE = {
  walletTtlSeconds: CACHE_TTL_SECONDS.hotEntity,
  historyTtlMinSeconds: 60,
  historyTtlMaxSeconds: 300,
  invalidateOn: ["PointsEarned", "PointsRedeemed", "PointsExpired", "SaleCompleted", "OrderPaid"] as const,
  neverSourceOfTruth: true,
} as const;

/**
 * Analytics event names (emit via analytics plane later).
 * ADR-087 Analytics Impact: WalletViewed → LoyaltyWalletViewed catalog name.
 */
export const CUSTOMER_DASHBOARD_EVENTS = {
  walletViewed: "LoyaltyWalletViewed",
  receiptViewed: "ReceiptViewed",
} as const;

/** Persian customer copy for portal chrome and stubs. */
export const CUSTOMER_DASHBOARD_COPY_FA = {
  homeTitle: "پنل من",
  homeLead: "امتیاز، سفارش‌ها و رسیدهای همین فروشگاه",
  ordersTitle: "سفارش‌های من",
  walletTitle: "کیف امتیاز",
  rewardsTitle: "جایزه‌ها",
  receiptsTitle: "رسیدها",
  navHome: "پنل",
  navOrders: "سفارش‌ها",
  navWallet: "کیف امتیاز",
  navRewards: "جایزه‌ها",
  navReceipts: "رسیدها",
  navNotifications: "اعلان‌ها",
  navBackStorefront: "بازگشت به ویترین",
  authRequired: "برای مشاهدهٔ پنل وارد شوید.",
  authHint: "ورود با پیامک برای اعضای همین فروشگاه",
  ordersEmpty: "هنوز سفارشی ندارید.",
  walletEmpty: LOYALTY_COPY_FA.balanceEmpty,
  rewardsEmpty: "هنوز جایزه‌ای فعال نیست.",
  receiptsEmpty: "رسیدی برای نمایش نیست.",
  receiptsDownloadLater: "دانلود رسید به‌زودی در دسترس است.",
  historyEmpty: "هنوز خریدی ثبت نشده.",
  loading: "در حال بارگذاری…",
  errorRetry: "مشکلی پیش آمد. دوباره تلاش کنید.",
  logout: "خروج",
  logoutDone: "از حساب خارج شدید.",
  priceUnit: "تومان",
  moneyHint: "مبالغ به تومان",
  jalaliHint: "تاریخ‌ها به تقویم شمسی (تهران)",
  membershipScopedHint: "فقط اطلاعات عضویت همین مغازه نمایش داده می‌شود.",
  pointsUnit: LOYALTY_COPY_FA.pointsUnit,
  noCrossStore: "اطلاعات فروشگاه دیگر در این پنل دیده نمی‌شود.",
  pickupOnlyHint: "سفارش‌های آنلاین فقط به‌صورت حضوری (پیکاپ) هستند.",
  phoneLabel: "شماره موبایل",
  joinedAtLabel: "عضویت از",
  profileSection: "عضویت من",
} as const;

export type CustomerDashboardMembershipContext = {
  customerId: string;
  storeId: string;
  membershipId: string;
  membershipStoreId: string;
};

/**
 * uiuxpromax gate evidence for ADR-103 customer OTP portal.
 * Brief: docs/execution/plans/ADR-103.md
 */
export const CUSTOMER_DASHBOARD_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-103.md",
  gatePassed: true,
  skillPresent: true,
  docsPresent: true,
  uiInScope: true,
  brief: {
    persian: true,
    rtl: true,
    faIrPersona: true,
    mobile390: true,
    iranianRetailContext: true,
    screenListDocumented: true,
    statesDocumented: true,
    a11yNotes: true,
  },
} as const;

export function assertCustomerDashboardUiuxGate(): void {
  assertUiuxGate({
    gatePassed: CUSTOMER_DASHBOARD_UIUX_GATE.gatePassed,
    skillPresent: CUSTOMER_DASHBOARD_UIUX_GATE.skillPresent,
    docsPresent: CUSTOMER_DASHBOARD_UIUX_GATE.docsPresent,
    uiInScope: CUSTOMER_DASHBOARD_UIUX_GATE.uiInScope,
    brief: { ...CUSTOMER_DASHBOARD_UIUX_GATE.brief },
  });
}

export function customerDashboardHomePath(storeSlug: string): string {
  return `${buildStorefrontPath(storeSlug)}/dashboard`;
}

export function customerDashboardOrdersPath(storeSlug: string): string {
  return `${customerDashboardHomePath(storeSlug)}/orders`;
}

export function customerDashboardWalletPath(storeSlug: string): string {
  return `${customerDashboardHomePath(storeSlug)}/wallet`;
}

export function customerDashboardRewardsPath(storeSlug: string): string {
  return `${customerDashboardHomePath(storeSlug)}/rewards`;
}

export function customerDashboardReceiptsPath(storeSlug: string): string {
  return `${customerDashboardHomePath(storeSlug)}/receipts`;
}

export function assertCustomerDashboardAuthRequired(authenticated: boolean): void {
  if (!CUSTOMER_DASHBOARD_DECISION.authRequired) {
    throw new Error("Customer dashboard must require auth (ADR-087).");
  }
  if (!authenticated) {
    throw new Error(
      `Customer dashboard requires authentication (ADR-087). ${CUSTOMER_DASHBOARD_COPY_FA.authRequired}`,
    );
  }
}

export function assertCustomerDashboardRole(role: string): void {
  assertCustomerJwtRole(role);
  if (role !== CUSTOMER_DASHBOARD_DECISION.authRole) {
    throw new Error(
      `Customer dashboard accepts role="${CUSTOMER_DASHBOARD_DECISION.authRole}" only (ADR-087); got "${role}".`,
    );
  }
}

/**
 * Membership must belong to the store in the URL — no cross-store leak.
 */
export function assertMembershipScopedToStore(
  ctx: CustomerDashboardMembershipContext,
): void {
  if (!ctx.customerId?.trim() || !ctx.membershipId?.trim()) {
    throw new Error("Customer dashboard requires customerId and membershipId (ADR-087).");
  }
  if (!ctx.storeId?.trim() || !ctx.membershipStoreId?.trim()) {
    throw new Error("Customer dashboard requires storeId and membershipStoreId (ADR-087).");
  }
  if (ctx.storeId !== ctx.membershipStoreId) {
    throw new Error(
      `Cross-store leak blocked (ADR-087): membership store "${ctx.membershipStoreId}" ≠ route store "${ctx.storeId}".`,
    );
  }
}

export function assertNoMerchantChromeOnCustomerDashboard(chrome: string): void {
  const forbidden = ["merchant", "staff", "pos", "owner", "admin"];
  if (forbidden.includes(chrome)) {
    throw new Error(
      `Customer dashboard must not use "${chrome}" chrome (ADR-087). Staff PWA is ADR-022.`,
    );
  }
}

export function assertNoDeliveryOnCustomerDashboard(feature: string): void {
  const forbidden = ["delivery", "courier", "shipping", "rider"];
  if (forbidden.includes(feature)) {
    throw new Error(
      `Customer dashboard forbids "${feature}" (ADR-087). Pickup-only history.`,
    );
  }
}

export function assertCustomerAudienceOnly(audience: string): void {
  if (audience !== CUSTOMER_AUTH_DECISION.audience) {
    throw new Error(
      `Customer dashboard audience must be "${CUSTOMER_AUTH_DECISION.audience}" (ADR-087); got "${audience}".`,
    );
  }
}

export const CUSTOMER_DASHBOARD = {
  decision: CUSTOMER_DASHBOARD_DECISION,
  surfaces: CUSTOMER_DASHBOARD_SURFACES,
  apiPaths: CUSTOMER_DASHBOARD_API_PATHS,
  appPaths: CUSTOMER_DASHBOARD_APP_PATHS,
  cache: CUSTOMER_DASHBOARD_CACHE,
  events: CUSTOMER_DASHBOARD_EVENTS,
  copyFa: CUSTOMER_DASHBOARD_COPY_FA,
  uiuxGate: CUSTOMER_DASHBOARD_UIUX_GATE,
} as const;
