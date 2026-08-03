/**
 * ADR-022 — Merchant Staff PWA Architecture.
 *
 * Installable MerchantOS staff POS PWA (ARD-017).
 * NEVER conflate with store customer PWA (ADR-023 / ARD-029).
 */

import { URL_PATHS } from "../app-router-structure/index.js";
import { MERCHANT_AUTH_DECISION } from "../merchant-auth/index.js";
import { assertUiuxGate } from "../uiuxpromax-gate/index.js";

/** Binding Decision (ADR-022). */
export const STAFF_PWA_DECISION = {
  adr: "ADR-022",
  installable: true,
  startUrlTarget: "pos" as const,
  brandingSource: "merchantos" as const,
  sharedWithStoreCustomerPwa: false,
  offlineQueueAdr: "ADR-024",
  rationale: "peak_hour_pos_reliability",
} as const;

/**
 * Audience isolation — store customer PWA is a different product (ADR-023).
 * Reserved customer paths are documented so staff manifests never collide.
 */
export const STAFF_PWA_AUDIENCE = {
  id: "staff" as const,
  forbiddenAudience: "store-customer" as const,
  authAudience: MERCHANT_AUTH_DECISION.audience,
  allowedRoles: ["merchant_owner", "store_employee"] as const,
  forbiddenRole: "customer" as const,
  storeCustomerPwaAdr: "ADR-023",
  storeCustomerManifestPattern: "/s/{storeSlug}/manifest.webmanifest",
  storeCustomerStartUrlPattern: "/s/{storeSlug}",
  rule: "Never share manifests, start_url, service-worker scope, or auth cookies with store customer PWA (ADR-022 / ADR-023).",
} as const;

/** Manifest path strategy (staff — MerchantOS branding). */
export const STAFF_PWA_PATHS = {
  manifestPath: "/staff/manifest.webmanifest" as const,
  startUrl: URL_PATHS.merchantPos,
  /**
   * Root scope so `/staff` manifest + `/pos` start_url share one installable app.
   * Narrower `/pos/` would exclude the reserved `/staff` manifest URL.
   */
  scope: "/" as const,
  manifestScopeNote:
    "manifest=/staff/manifest.webmanifest; start_url=/pos; scope=/ (covers both)",
} as const;

/** App Router paths relative to repo root. */
export const STAFF_PWA_APP_PATHS = {
  manifestRoute:
    "app/(merchant)/staff/manifest.webmanifest/route.ts",
  installPrompt: "app/(merchant)/pos/install-prompt.tsx",
  posPage: "app/(merchant)/pos/page.tsx",
} as const;

/**
 * Offline policy — online-first P0; sale queue + SW via ADR-024 (`src/pos-offline`).
 */
export const STAFF_PWA_OFFLINE = {
  mode: "online_first_with_offline_queue_p1" as const,
  saleQueue: "pos_offline" as const,
  serviceWorker: "/sw-staff.js" as const,
  indexedDb: "mos-staff-pos" as const,
  offlinePackage: "src/pos-offline" as const,
  offlineAdr: "ADR-024" as const,
  bannerFa: "اتصال قطع است — فروش در صف آفلاین ذخیره شد.",
  noteFa:
    "مسیر آنلاین صندوق اولویت P0 است؛ صف فروش آفلاین و همگام‌سازی در ADR-024 (`src/pos-offline`) فعال است.",
  rule: "Staff offline queue is ADR-024 only; store customer catalog stretch is ADR-023.",
} as const;

/** Growth / analytics events (emit via analytics ADRs later). */
export const STAFF_PWA_EVENTS = {
  installPromptShown: "StaffPwaInstallPromptShown",
  installed: "StaffPwaInstalled",
  appOpened: "AppOpened",
  appOpenedSource: "staff-pwa",
} as const;

/** httpOnly cookie isolation vs customer PWA (ADR-022 Security). */
export const STAFF_PWA_COOKIE_ISOLATION = {
  httpOnlyRequired: true,
  audience: "merchant_staff" as const,
  neverShareWithCustomerStorePwa: true,
  customerCookieAudience: "customer" as const,
  rule: "Isolate staff session cookies from customer store PWA cookies (names/paths/scopes).",
} as const;

/** Persian install chrome (staff POS). */
export const STAFF_PWA_COPY_FA = {
  bannerTitle: "نصب اپلیکیشن صندوق",
  bannerBody:
    "صندوق فروش کاسبینو را سریع از صفحهٔ اصلی باز کنید — مناسب عجلهٔ پیشخوان.",
  cashierHint: "بارکد، شماره موبایل مشتری، و جمع به تومان روی صندوق.",
  installCta: "افزودن به صفحهٔ اصلی",
  dismissCta: "الان نه",
  installing: "در حال آماده‌سازی…",
  installed: "اپلیکیشن صندوق روی دستگاه شماست.",
  regionLabel: "پیشنهاد نصب اپلیکیشن صندوق",
  browserHint: "از منوی مرورگر، «افزودن به صفحهٔ اصلی» را انتخاب کنید.",
} as const;

export const STAFF_PWA_INSTALL_UX = {
  minTouchTargetPx: 44,
  display: "standalone" as const,
  lang: "fa" as const,
  dir: "rtl" as const,
  copyFa: STAFF_PWA_COPY_FA,
} as const;

/** MerchantOS staff theme (distinct from store customer teal branding). */
export const STAFF_DEFAULT_THEME_COLOR = "#0f172a";

/** Default lightweight icon until brand assets land. */
export const STAFF_PWA_DEFAULT_ICON = {
  src: "/icons/staff-pwa-default.svg",
  sizes: "any",
  type: "image/svg+xml",
  purpose: "any",
} as const;

export const STAFF_MANIFEST_CONTENT_TYPE =
  "application/manifest+json; charset=utf-8";

export const STAFF_PWA_BRANDING = {
  name: "کاسبینو صندوق",
  shortName: "صندوق",
  description: "پایانه فروش پرسنل — کاسبینو",
} as const;

export type StaffWebManifest = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  lang: "fa";
  dir: "rtl";
  start_url: string;
  scope: string;
  display: "standalone";
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
};

/**
 * uiuxpromax gate evidence for ADR-022 install chrome.
 * Brief: docs/execution/plans/ADR-022.md
 */
export const STAFF_PWA_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-022.md",
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

export function assertStaffPwaUiuxGate(): void {
  assertUiuxGate({
    gatePassed: STAFF_PWA_UIUX_GATE.gatePassed,
    skillPresent: STAFF_PWA_UIUX_GATE.skillPresent,
    docsPresent: STAFF_PWA_UIUX_GATE.docsPresent,
    uiInScope: STAFF_PWA_UIUX_GATE.uiInScope,
    brief: { ...STAFF_PWA_UIUX_GATE.brief },
  });
}

export function staffManifestPath(): string {
  return STAFF_PWA_PATHS.manifestPath;
}

export function staffStartUrl(): string {
  return STAFF_PWA_PATHS.startUrl;
}

export function staffScope(): string {
  return STAFF_PWA_PATHS.scope;
}

export function assertNotStoreCustomerPwaAudience(audience: string): void {
  if (audience === STAFF_PWA_AUDIENCE.forbiddenAudience) {
    throw new Error(
      "Staff PWA must not use store-customer audience (ADR-022). Store customer PWA is ADR-023.",
    );
  }
  if (audience !== STAFF_PWA_AUDIENCE.id) {
    throw new Error(
      `Staff PWA audience must be "${STAFF_PWA_AUDIENCE.id}" (ADR-022); got "${audience}".`,
    );
  }
}

export function assertMerchantStaffJwtOnly(role: string): void {
  const normalized = role.trim().toLowerCase();
  if (normalized === STAFF_PWA_AUDIENCE.forbiddenRole) {
    throw new Error(
      "Staff PWA rejects customer JWT (ADR-022). Customer store PWA is ADR-023.",
    );
  }
  const allowed = STAFF_PWA_AUDIENCE.allowedRoles as readonly string[];
  if (!allowed.includes(normalized)) {
    throw new Error(
      `Staff PWA accepts merchant staff roles only (${allowed.join("|")}); got "${role}" (ADR-022).`,
    );
  }
}

export function assertManifestDoesNotCollideWithStoreCustomer(
  manifestPath: string,
): void {
  if (manifestPath === STAFF_PWA_PATHS.manifestPath) {
    return;
  }
  const isStoreCustomerManifest =
    manifestPath === "/s" ||
    manifestPath.startsWith("/s/") ||
    (/\/manifest\.webmanifest$/.test(manifestPath) &&
      manifestPath.includes("/s/"));
  if (isStoreCustomerManifest) {
    throw new Error(
      "Staff PWA must not use store customer manifest paths (ADR-022 / ADR-023).",
    );
  }
}

/**
 * Build MerchantOS staff Web App Manifest JSON (static endpoint).
 */
export function buildStaffManifest(): StaffWebManifest {
  const startUrl = staffStartUrl();
  return {
    id: startUrl,
    name: STAFF_PWA_BRANDING.name,
    short_name: STAFF_PWA_BRANDING.shortName,
    description: STAFF_PWA_BRANDING.description,
    lang: "fa",
    dir: "rtl",
    start_url: startUrl,
    scope: staffScope(),
    display: STAFF_PWA_INSTALL_UX.display,
    background_color: "#f8fafc",
    theme_color: STAFF_DEFAULT_THEME_COLOR,
    icons: [
      {
        src: STAFF_PWA_DEFAULT_ICON.src,
        sizes: STAFF_PWA_DEFAULT_ICON.sizes,
        type: STAFF_PWA_DEFAULT_ICON.type,
        purpose: STAFF_PWA_DEFAULT_ICON.purpose,
      },
    ],
  };
}

export const STAFF_PWA = {
  decision: STAFF_PWA_DECISION,
  audience: STAFF_PWA_AUDIENCE,
  paths: STAFF_PWA_PATHS,
  appPaths: STAFF_PWA_APP_PATHS,
  offline: STAFF_PWA_OFFLINE,
  events: STAFF_PWA_EVENTS,
  cookies: STAFF_PWA_COOKIE_ISOLATION,
  installUx: STAFF_PWA_INSTALL_UX,
  copyFa: STAFF_PWA_COPY_FA,
  branding: STAFF_PWA_BRANDING,
  defaultIcon: STAFF_PWA_DEFAULT_ICON,
  uiuxGate: STAFF_PWA_UIUX_GATE,
} as const;
