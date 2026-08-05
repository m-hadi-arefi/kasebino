/**
 * ADR-017 — App Router Structure contract.
 * Route groups separate marketing / merchant / storefront / admin audiences.
 * Storefront URLs are path-based `/s/[storeSlug]` (ADR-091). No delivery routes.
 */

import {
  STOREFRONT_URL,
  buildStorefrontPath,
} from "../product-architecture/index.js";

/** App Router filesystem root (ADR-016 / ADR-017). */
export const ROUTES_ROOT = "app" as const;

/** Next.js route-group folder names (parentheses omit from URL). */
export const ROUTE_GROUPS = {
  marketing: "(marketing)",
  merchant: "(merchant)",
  storefront: "(storefront)",
  admin: "(admin)",
} as const;

export type RouteGroupId = keyof typeof ROUTE_GROUPS;

/** Public URL segments (outside route-group folder names). */
export const URL_PATHS = {
  marketingHome: "/",
  merchantDashboard: "/dashboard",
  merchantPos: "/pos",
  /** ADR-101 — pickup order lifecycle board (staff). */
  merchantOrders: "/orders",
  /** ADR-022 — staff PWA manifest (MerchantOS; never per-store customer). */
  merchantStaffManifest: "/staff/manifest.webmanifest",
  merchantStaffPrefix: "/staff",
  adminRoot: "/admin",
  storefrontPrefix: STOREFRONT_URL.prefix,
  storefrontPattern: "/s/[storeSlug]",
  apiV1: "/api/v1",
} as const;

/** Dynamic segment name for storefront (product/ADR-091 — not bare `slug`). */
export const STOREFRONT_PARAM = "storeSlug" as const;

/**
 * Filesystem layout under `app/` (relative to repo root).
 * Marketing owns `/`; merchant/admin nest under path segments to avoid collisions.
 */
export const APP_ROUTER_FILESYSTEM = {
  routesRoot: ROUTES_ROOT,
  rootLayout: `${ROUTES_ROOT}/layout.tsx`,
  marketing: {
    group: `${ROUTES_ROOT}/${ROUTE_GROUPS.marketing}`,
    layout: `${ROUTES_ROOT}/${ROUTE_GROUPS.marketing}/layout.tsx`,
    page: `${ROUTES_ROOT}/${ROUTE_GROUPS.marketing}/page.tsx`,
  },
  merchant: {
    group: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}`,
    layout: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/layout.tsx`,
    dashboardPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/dashboard/page.tsx`,
    posPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/pos/page.tsx`,
    /** ADR-101 — pickup order lifecycle board. */
    ordersPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/orders/page.tsx`,
    /** ADR-104 — store location form + QR print. */
    storesPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/stores/page.tsx`,
    storeLocationPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/stores/[id]/location/page.tsx`,
    storeQrPrintPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/stores/[id]/qr/page.tsx`,
    /** ADR-022 — merchant staff PWA manifest (never store customer). */
    manifestRoute: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/staff/manifest.webmanifest/route.ts`,
    installPrompt: `${ROUTES_ROOT}/${ROUTE_GROUPS.merchant}/pos/install-prompt.tsx`,
  },
  storefront: {
    group: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}`,
    layout: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/layout.tsx`,
    storePage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/page.tsx`,
    /** ADR-086 / ADR-100 — live catalog + PDP + about + checkout. */
    catalogPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/catalog/page.tsx`,
    productPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/catalog/[productId]/page.tsx`,
    checkoutPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/checkout/page.tsx`,
    aboutPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/about/page.tsx`,
    /** ADR-023 — per-store customer PWA manifest (never staff). */
    manifestRoute: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/manifest.webmanifest/route.ts`,
    installPrompt: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/install-prompt.tsx`,
    /** ADR-087 / ADR-103 — membership-scoped customer portal. */
    dashboardPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/dashboard/page.tsx`,
    dashboardOrdersPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/dashboard/orders/page.tsx`,
    dashboardWalletPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/dashboard/wallet/page.tsx`,
    dashboardRewardsPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/dashboard/rewards/page.tsx`,
    dashboardReceiptsPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/dashboard/receipts/page.tsx`,
    loginPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.storefront}/s/[${STOREFRONT_PARAM}]/login/page.tsx`,
  },
  admin: {
    group: `${ROUTES_ROOT}/${ROUTE_GROUPS.admin}`,
    layout: `${ROUTES_ROOT}/${ROUTE_GROUPS.admin}/layout.tsx`,
    page: `${ROUTES_ROOT}/${ROUTE_GROUPS.admin}/admin/page.tsx`,
    /** ADR-089 — Persian merchant list / enforcement / security / audit stubs. */
    merchantsPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.admin}/admin/merchants/page.tsx`,
    securityPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.admin}/admin/security/page.tsx`,
    auditPage: `${ROUTES_ROOT}/${ROUTE_GROUPS.admin}/admin/audit/page.tsx`,
  },
  apiV1Dir: `${ROUTES_ROOT}/api/v1`,
  middlewareFile: "middleware.ts",
} as const;

/**
 * URL path segments that must never be scaffolded in MVP (ADR-015 / ADR-082).
 * Pickup-only — no delivery/courier surfaces.
 */
export const FORBIDDEN_URL_SEGMENTS = [
  "delivery",
  "courier",
  "shipping",
  "rider",
] as const;

export type ForbiddenUrlSegment = (typeof FORBIDDEN_URL_SEGMENTS)[number];

/** Audience labels for coarse middleware / future PageViewed analytics. */
export type RouteAudience =
  | "marketing"
  | "merchant"
  | "storefront"
  | "admin"
  | "api"
  | "unknown";

export const ROUTE_AUDIENCE_HEADER = "x-mos-route-audience" as const;

/**
 * Coarse middleware gates (auth enforcement lands with surface ADRs).
 * Order matters: more specific prefixes before marketing catch-all.
 */
export const MIDDLEWARE_GATES = {
  api: { pathPrefixes: [URL_PATHS.apiV1, "/api/"] as const, audience: "api" as const },
  admin: {
    pathPrefixes: [URL_PATHS.adminRoot] as const,
    audience: "admin" as const,
    authIntent: "platform_admin",
  },
  storefront: {
    pathPrefixes: [URL_PATHS.storefrontPrefix] as const,
    audience: "storefront" as const,
    authIntent: "optional_customer",
  },
  merchant: {
    pathPrefixes: [
      URL_PATHS.merchantDashboard,
      URL_PATHS.merchantPos,
      URL_PATHS.merchantOrders,
      URL_PATHS.merchantStaffPrefix,
    ] as const,
    audience: "merchant" as const,
    authIntent: "merchant_session",
  },
  marketing: {
    pathPrefixes: [URL_PATHS.marketingHome] as const,
    audience: "marketing" as const,
    authIntent: "public",
  },
} as const;

export function storefrontAppPath(storeSlug: string): string {
  return buildStorefrontPath(storeSlug);
}

export function isForbiddenUrlSegment(segment: string): segment is ForbiddenUrlSegment {
  return (FORBIDDEN_URL_SEGMENTS as readonly string[]).includes(segment);
}

export function assertNoForbiddenUrlSegment(segment: string): void {
  if (isForbiddenUrlSegment(segment)) {
    throw new Error(
      `URL segment "${segment}" is forbidden in MVP (ADR-017 / ADR-015). Pickup-only; no delivery.`,
    );
  }
}

/** Classify pathname for coarse middleware / analytics (no auth). */
export function classifyRouteAudience(pathname: string): RouteAudience {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === URL_PATHS.apiV1 || path.startsWith(`${URL_PATHS.apiV1}/`) || path.startsWith("/api/")) {
    return "api";
  }
  if (path === URL_PATHS.adminRoot || path.startsWith(`${URL_PATHS.adminRoot}/`)) {
    return "admin";
  }
  if (path === "/s" || path.startsWith(URL_PATHS.storefrontPrefix)) {
    return "storefront";
  }
  if (
    path === URL_PATHS.merchantDashboard ||
    path.startsWith(`${URL_PATHS.merchantDashboard}/`) ||
    path === URL_PATHS.merchantPos ||
    path.startsWith(`${URL_PATHS.merchantPos}/`) ||
    path === URL_PATHS.merchantOrders ||
    path.startsWith(`${URL_PATHS.merchantOrders}/`) ||
    path === URL_PATHS.merchantStaffPrefix ||
    path.startsWith(`${URL_PATHS.merchantStaffPrefix}/`)
  ) {
    return "merchant";
  }
  if (path === "/" || path === "") {
    return "marketing";
  }
  return "unknown";
}

export function assertStorefrontParamName(param: string): void {
  if (param !== STOREFRONT_PARAM) {
    throw new Error(
      `Storefront dynamic param must be "${STOREFRONT_PARAM}" (ADR-017 / ADR-091); got "${param}".`,
    );
  }
}

export const APP_ROUTER_STRUCTURE = {
  routeGroups: ROUTE_GROUPS,
  urlPaths: URL_PATHS,
  storefrontParam: STOREFRONT_PARAM,
  filesystem: APP_ROUTER_FILESYSTEM,
  forbiddenUrlSegments: FORBIDDEN_URL_SEGMENTS,
  middlewareGates: MIDDLEWARE_GATES,
  audienceHeader: ROUTE_AUDIENCE_HEADER,
  fulfillment: "pickup_only" as const,
} as const;
