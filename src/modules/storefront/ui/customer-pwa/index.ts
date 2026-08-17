/**
 * ADR-023 — Store Customer PWA Architecture.
 *
 * Per-store installable customer PWA with store branding and start_url → storefront.
 * NEVER conflate with merchant staff PWA (ADR-022 / ARD-017).
 */

import { CUSTOMER_JWT_CLAIMS_CONTRACT } from "../../../customer-identity/domain/auth/index.js";
import { buildStorefrontPath } from "../../../../shared/architecture/product/index.js";
import { assertUiuxGate } from "../../../../shared/contracts/uiuxpromax-gate/index.js";

/** Binding Decision (ADR-023). */
export const STORE_CUSTOMER_PWA_DECISION = {
  adr: "ADR-023",
  perStoreInstallable: true,
  startUrlTarget: "storefront" as const,
  brandingSource: "store" as const,
  globalConsumerApp: false,
  rationale: "growth_loop_store_pwa",
} as const;

/**
 * Audience isolation — staff PWA is a different product (ADR-022).
 * Reserved staff paths are documented so customer manifests never collide.
 */
export const STORE_CUSTOMER_PWA_AUDIENCE = {
  id: "store-customer" as const,
  forbiddenAudience: "staff" as const,
  authRole: CUSTOMER_JWT_CLAIMS_CONTRACT.role,
  staffPwaAdr: "ADR-022",
  staffManifestPathReserved: "/staff/manifest.webmanifest",
  staffStartUrlReserved: "/pos",
  rule: "Never share manifests, start_url, service-worker scope, or auth cookies with staff PWA (ADR-023 / ADR-022).",
} as const;

/** Manifest + meta path strategy (ARD-029). */
export const STORE_CUSTOMER_PWA_PATHS = {
  /** Relative to store root `/s/{storeSlug}`. */
  manifestSegment: "manifest.webmanifest" as const,
  /** Reserved API — handler may land with branding/MinIO wiring. */
  pwaMetaApiPattern: "/api/v1/stores/:id/pwa-meta" as const,
} as const;

/** App Router paths relative to repo root. */
export const STORE_CUSTOMER_PWA_APP_PATHS = {
  manifestRoute:
    "app/(storefront)/s/[storeSlug]/manifest.webmanifest/route.ts",
  installPrompt:
    "app/(storefront)/s/[storeSlug]/install-prompt.tsx",
  storeHome: "app/(storefront)/s/[storeSlug]/page.tsx",
} as const;

/** Offline policy — MVP online-first; catalog read-mostly is stretch. */
export const STORE_CUSTOMER_PWA_OFFLINE = {
  mode: "online_first" as const,
  catalog: "read_mostly_stretch" as const,
  authRequiresNetwork: true,
  ordersRequireNetwork: true,
  serviceWorker: "/sw-store-customer.js" as const,
  audience: "store-customer" as const,
  sharedWithStaffForbidden: true,
  noteFa:
    "کاتالوگ ممکن است بعداً برای مشاهدهٔ آفلاین ذخیره شود؛ ورود و سفارش فعلاً به اینترنت نیاز دارند.",
  rule: "Do not promise offline checkout; staff offline queue is ADR-022/024 only.",
} as const;

/** Growth-loop events (emit via analytics ADRs later). */
export const STORE_CUSTOMER_PWA_EVENTS = {
  installPromptShown: "StorePwaInstallPromptShown",
  installed: "StorePwaInstalled",
  appOpened: "AppOpened",
  appOpenedSource: "store-pwa",
} as const;

/** Persian install chrome (customer storefront). */
export const STORE_CUSTOMER_PWA_COPY_FA = {
  bannerTitle: "نصب اپلیکیشن فروشگاه",
  bannerBody: "برای سفارش و امتیاز، سریع‌تر از صفحهٔ اصلی باز کنید.",
  installCta: "افزودن به صفحهٔ اصلی",
  dismissCta: "الان نه",
  installing: "در حال آماده‌سازی…",
  installed: "اپلیکیشن فروشگاه روی دستگاه شماست.",
  regionLabel: "پیشنهاد نصب اپلیکیشن فروشگاه",
  browserHint: "از منوی مرورگر، «افزودن به صفحهٔ اصلی» را انتخاب کنید.",
  iosHint:
    "در سافاری آیفون: دکمهٔ اشتراک‌گذاری را بزنید، سپس «Add to Home Screen» / «افزودن به صفحهٔ اصلی» را انتخاب کنید.",
  offlineNote:
    "کاتالوگ ممکن است بعداً برای مشاهدهٔ آفلاین ذخیره شود؛ ورود و سفارش فعلاً به اینترنت نیاز دارند.",
} as const;

export const STORE_CUSTOMER_PWA_INSTALL_UX = {
  minTouchTargetPx: 44,
  display: "standalone" as const,
  lang: "fa" as const,
  dir: "rtl" as const,
  copyFa: STORE_CUSTOMER_PWA_COPY_FA,
} as const;

/** Default theme when store branding has no primary color. */
export const STORE_CUSTOMER_DEFAULT_THEME_COLOR = "#0f766e";

/** Default lightweight icon until MinIO store branding is wired. */
export const STORE_CUSTOMER_PWA_DEFAULT_ICON = {
  src: "/icons/store-customer-pwa-default.svg",
  sizes: "any",
  type: "image/svg+xml",
  purpose: "any",
} as const;

export const STORE_CUSTOMER_MANIFEST_CONTENT_TYPE =
  "application/manifest+json; charset=utf-8";

export type StoreCustomerPwaBranding = {
  displayName: string;
  primaryColor?: string | null;
  iconSrc?: string | null;
};

export type StoreCustomerWebManifest = {
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
 * uiuxpromax gate evidence for ADR-023 / ADR-105 install chrome.
 * Brief: docs/execution/plans/ADR-105.md
 */
export const STORE_CUSTOMER_PWA_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-105.md",
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

export function assertStoreCustomerPwaUiuxGate(): void {
  assertUiuxGate({
    gatePassed: STORE_CUSTOMER_PWA_UIUX_GATE.gatePassed,
    skillPresent: STORE_CUSTOMER_PWA_UIUX_GATE.skillPresent,
    docsPresent: STORE_CUSTOMER_PWA_UIUX_GATE.docsPresent,
    uiInScope: STORE_CUSTOMER_PWA_UIUX_GATE.uiInScope,
    brief: { ...STORE_CUSTOMER_PWA_UIUX_GATE.brief },
  });
}

export function storeCustomerManifestPath(storeSlug: string): string {
  const slug = storeSlug.trim();
  if (!slug) {
    throw new Error("storeSlug is required for store customer manifest (ADR-023).");
  }
  return `${buildStorefrontPath(slug)}/${STORE_CUSTOMER_PWA_PATHS.manifestSegment}`;
}

export function storeCustomerStartUrl(storeSlug: string): string {
  return buildStorefrontPath(storeSlug);
}

export function storeCustomerScope(storeSlug: string): string {
  return `${buildStorefrontPath(storeSlug)}/`;
}

export function assertNotStaffPwaAudience(audience: string): void {
  if (audience === STORE_CUSTOMER_PWA_AUDIENCE.forbiddenAudience) {
    throw new Error(
      "Store customer PWA must not use staff audience (ADR-023). Staff PWA is ADR-022.",
    );
  }
  if (audience !== STORE_CUSTOMER_PWA_AUDIENCE.id) {
    throw new Error(
      `Store customer PWA audience must be "${STORE_CUSTOMER_PWA_AUDIENCE.id}" (ADR-023); got "${audience}".`,
    );
  }
}

export function assertCustomerJwtOnlyForStorePwa(role: string): void {
  if (role !== STORE_CUSTOMER_PWA_AUDIENCE.authRole) {
    throw new Error(
      `Store customer PWA accepts customer JWT only (role=customer); got "${role}" (ADR-023).`,
    );
  }
}

export function assertManifestDoesNotCollideWithStaff(manifestPath: string): void {
  if (manifestPath === STORE_CUSTOMER_PWA_AUDIENCE.staffManifestPathReserved) {
    throw new Error(
      "Store customer manifest must not use staff manifest path (ADR-023 / ADR-022).",
    );
  }
  if (
    manifestPath === STORE_CUSTOMER_PWA_AUDIENCE.staffStartUrlReserved ||
    manifestPath.startsWith(`${STORE_CUSTOMER_PWA_AUDIENCE.staffStartUrlReserved}/`)
  ) {
    throw new Error(
      "Store customer PWA must not target staff POS paths (ADR-023 / ADR-022).",
    );
  }
}

export function assertStoreCustomerPwaBranding(
  branding: StoreCustomerPwaBranding,
): void {
  const name = branding.displayName?.trim();
  if (!name) {
    throw new Error("Store customer PWA branding requires displayName (ADR-023).");
  }
}

/**
 * Prefer usable public URL/path icons; MinIO keys map to storefront logo proxy (ADR-111).
 */
export function resolveStoreCustomerIconSrc(
  logoObjectKey: string | null | undefined,
  storeSlug?: string | null,
): string | null {
  const key = logoObjectKey?.trim();
  if (!key) return null;
  if (
    key.startsWith("https://") ||
    key.startsWith("http://") ||
    key.startsWith("/")
  ) {
    return key;
  }
  const slug = storeSlug?.trim();
  if (slug) {
    return `/api/v1/storefront/${encodeURIComponent(slug)}/logo`;
  }
  return null;
}

function truncateShortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 11)}…`;
}

/**
 * Build per-store Web App Manifest JSON (dynamic endpoint).
 */
export function buildStoreCustomerManifest(
  storeSlug: string,
  branding: StoreCustomerPwaBranding,
): StoreCustomerWebManifest {
  assertStoreCustomerPwaBranding(branding);
  const startUrl = storeCustomerStartUrl(storeSlug);
  const scope = storeCustomerScope(storeSlug);
  const theme =
    branding.primaryColor?.trim() || STORE_CUSTOMER_DEFAULT_THEME_COLOR;
  const iconSrc =
    branding.iconSrc?.trim() || STORE_CUSTOMER_PWA_DEFAULT_ICON.src;

  return {
    id: startUrl,
    name: branding.displayName.trim(),
    short_name: truncateShortName(branding.displayName),
    description: "فروشگاه محلی — سفارش حضوری (پیکاپ)",
    lang: "fa",
    dir: "rtl",
    start_url: startUrl,
    scope,
    display: STORE_CUSTOMER_PWA_INSTALL_UX.display,
    background_color: "#f8faf9",
    theme_color: theme,
    icons: [
      {
        src: iconSrc,
        sizes: STORE_CUSTOMER_PWA_DEFAULT_ICON.sizes,
        type: iconSrc.endsWith(".svg")
          ? "image/svg+xml"
          : STORE_CUSTOMER_PWA_DEFAULT_ICON.type,
        purpose: STORE_CUSTOMER_PWA_DEFAULT_ICON.purpose,
      },
    ],
  };
}

export const STORE_CUSTOMER_PWA = {
  decision: STORE_CUSTOMER_PWA_DECISION,
  audience: STORE_CUSTOMER_PWA_AUDIENCE,
  paths: STORE_CUSTOMER_PWA_PATHS,
  appPaths: STORE_CUSTOMER_PWA_APP_PATHS,
  offline: STORE_CUSTOMER_PWA_OFFLINE,
  events: STORE_CUSTOMER_PWA_EVENTS,
  installUx: STORE_CUSTOMER_PWA_INSTALL_UX,
  copyFa: STORE_CUSTOMER_PWA_COPY_FA,
  defaultIcon: STORE_CUSTOMER_PWA_DEFAULT_ICON,
  uiuxGate: STORE_CUSTOMER_PWA_UIUX_GATE,
} as const;
