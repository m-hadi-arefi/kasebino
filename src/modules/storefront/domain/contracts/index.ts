/**
 * ADR-086 — Storefront Architecture.
 *
 * Dedicated per-store customer surface at path URL `/s/{storeSlug}`.
 * Catalog / about / pickup-entry only — no marketplace, no delivery, no POS imports.
 */

import {
  OUTPUT_MINIMIZATION,
  PUBLIC_DTO_FORBIDDEN_FIELDS,
  assertPublicDtoMinimized,
} from "../../../../infrastructure/security/contracts/api-protection/index.js";
import {
  assertUiMayImportDomain,
  isForbiddenUiDomainImport,
} from "../../../../shared/contracts/bounded-contexts/index.js";
import { CACHE_TTL_SECONDS } from "../../../../infrastructure/redis/cache-keys/index.js";
import {
  ALLOWED_FULFILLMENT_MODES,
  DEFAULT_FULFILLMENT_MODE,
  STOREFRONT_URL,
  assertPickupOnlyFulfillment,
  buildStorefrontPath,
} from "../../../../shared/architecture/product/index.js";
import { assertUiuxGate } from "../../../../shared/contracts/uiuxpromax-gate/index.js";

/** Binding Decision (ADR-086). */
export const STOREFRONT_ARCHITECTURE_DECISION = {
  adr: "ADR-086",
  dedicatedPerStore: true,
  urlStrategy: STOREFRONT_URL.strategy,
  pathPattern: STOREFRONT_URL.pattern,
  pathPrefix: STOREFRONT_URL.prefix,
  subdomainRequiredInMvp: false,
  marketplace: false,
  fulfillment: DEFAULT_FULFILLMENT_MODE,
  publicCacheSeconds: 600,
  rationale: "store_ownership",
} as const;

/** Filesystem / URL surface map under App Router storefront group. */
export const STOREFRONT_SURFACES = {
  home: {
    segment: "" as const,
    titleFa: "ویترین فروشگاه",
  },
  catalog: {
    segment: "catalog" as const,
    titleFa: "کاتالوگ کالاها",
  },
  about: {
    segment: "about" as const,
    titleFa: "دربارهٔ مغازه",
  },
  pickupEntry: {
    segment: "pickup" as const,
    titleFa: "سفارش حضوری (پیکاپ)",
  },
  /** ADR-087 — customer portal entry (auth required). */
  customerDashboard: {
    segment: "dashboard" as const,
    titleFa: "پنل من",
  },
} as const;

export type StorefrontSurfaceId = keyof typeof STOREFRONT_SURFACES;

/**
 * Public read ACL — catalog + ordering projections only.
 * Store branding is a presentation DTO (not POS). Customer OTP joins later (ADR-032).
 */
export const STOREFRONT_PUBLIC_ACL = {
  allowedReadContexts: ["catalog", "ordering"] as const,
  forbiddenDomainImports: ["pos"] as const,
  dtoMinimization: OUTPUT_MINIMIZATION,
  forbiddenDtoFields: PUBLIC_DTO_FORBIDDEN_FIELDS,
  noMarketplaceBrowse: true,
  rule: "Storefront public reads may project catalog and ordering only; never POS internals or cost/PII fields (ADR-086 / ADR-077).",
} as const;

/** Per-store branding presented on the customer storefront. */
export const STOREFRONT_BRANDING_FIELDS = [
  "displayName",
  "logoObjectKey",
  "primaryColor",
  "accentColor",
  "coverObjectKey",
] as const;

export type StorefrontBrandingField = (typeof STOREFRONT_BRANDING_FIELDS)[number];

export type StorefrontBranding = {
  displayName: string;
  logoObjectKey?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  coverObjectKey?: string | null;
};

/** Persian customer copy for storefront chrome and stubs. */
export const STOREFRONT_COPY_FA = {
  homeTitle: "ویترین فروشگاه",
  catalogTitle: "کاتالوگ کالاها",
  aboutTitle: "دربارهٔ مغازه",
  pickupCta: "سفارش حضوری (پیکاپ)",
  pickupOnlyHint: "سفارش فقط به‌صورت حضوری (پیکاپ) — بدون ارسال پیک",
  noDelivery: "ارسال پیک یا پیک موتوری در دسترس نیست.",
  catalogEmpty: "هنوز کالایی ثبت نشده.",
  loading: "در حال بارگذاری…",
  errorRetry: "مشکلی پیش آمد. دوباره تلاش کنید.",
  priceUnit: "تومان",
  navHome: "خانه",
  navCatalog: "کاتالوگ",
  navAbout: "درباره",
  navDashboard: "پنل من",
  seoTitleSuffix: "کاسبینو",
} as const;

/**
 * Pickup checkout entry — CTA only; full checkout flow is ADR-011 / ADR-082.
 */
export const STOREFRONT_PICKUP_CTA = {
  fulfillmentMode: DEFAULT_FULFILLMENT_MODE,
  allowedModes: ALLOWED_FULFILLMENT_MODES,
  labelFa: STOREFRONT_COPY_FA.pickupCta,
  hintFa: STOREFRONT_COPY_FA.pickupOnlyHint,
  minTouchTargetPx: 44,
  deliveryForbidden: true,
} as const;

/** Public route cache — ADR-086 Technical Impact. */
export const STOREFRONT_CACHE = {
  publicRoutesRevalidateSeconds: 600,
  ttlClassSeconds: CACHE_TTL_SECONDS.storefront,
} as const;

/** Funnel event reserved for analytics plane (emit later). */
export const STOREFRONT_EVENTS = {
  visited: "StorefrontVisited",
} as const;

/** App Router paths relative to repo root. */
export const STOREFRONT_APP_PATHS = {
  groupLayout: "app/(storefront)/layout.tsx",
  storeRoot: "app/(storefront)/s/[storeSlug]",
  homePage: "app/(storefront)/s/[storeSlug]/page.tsx",
  catalogPage: "app/(storefront)/s/[storeSlug]/catalog/page.tsx",
  aboutPage: "app/(storefront)/s/[storeSlug]/about/page.tsx",
} as const;

/**
 * uiuxpromax gate evidence for ADR-086 storefront stubs.
 * Brief: docs/execution/plans/ADR-086.md
 */
export const STOREFRONT_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-086.md",
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

export function assertStorefrontUiuxGate(): void {
  assertUiuxGate({
    gatePassed: STOREFRONT_UIUX_GATE.gatePassed,
    skillPresent: STOREFRONT_UIUX_GATE.skillPresent,
    docsPresent: STOREFRONT_UIUX_GATE.docsPresent,
    uiInScope: STOREFRONT_UIUX_GATE.uiInScope,
    brief: { ...STOREFRONT_UIUX_GATE.brief },
  });
}

export function storefrontHomePath(storeSlug: string): string {
  return buildStorefrontPath(storeSlug);
}

export function storefrontCatalogPath(storeSlug: string): string {
  return `${buildStorefrontPath(storeSlug)}/catalog`;
}

export function storefrontAboutPath(storeSlug: string): string {
  return `${buildStorefrontPath(storeSlug)}/about`;
}

export function storefrontPickupEntryPath(storeSlug: string): string {
  return `${buildStorefrontPath(storeSlug)}/pickup`;
}

/** Customer portal entry — ADR-087 (auth required under storefront). */
export function storefrontCustomerDashboardPath(storeSlug: string): string {
  return `${buildStorefrontPath(storeSlug)}/dashboard`;
}

export function isStorefrontAllowedReadContext(context: string): boolean {
  return (STOREFRONT_PUBLIC_ACL.allowedReadContexts as readonly string[]).includes(
    context,
  );
}

export function assertStorefrontAllowedReadContext(context: string): void {
  if (!isStorefrontAllowedReadContext(context)) {
    throw new Error(
      `Storefront public ACL forbids context "${context}" (ADR-086). Allowed: catalog, ordering.`,
    );
  }
}

export function assertNoStorefrontPosImport(moduleName: string): void {
  assertUiMayImportDomain("storefront", moduleName);
  if (
    (STOREFRONT_PUBLIC_ACL.forbiddenDomainImports as readonly string[]).includes(
      moduleName,
    )
  ) {
    throw new Error(
      `Storefront must not import POS domain module "${moduleName}" (ADR-086).`,
    );
  }
}

export function assertStorefrontPublicDto(dto: unknown): void {
  assertPublicDtoMinimized(dto);
}

export function assertStorefrontPickupOnly(mode: string): void {
  assertPickupOnlyFulfillment(mode);
  if (mode !== STOREFRONT_PICKUP_CTA.fulfillmentMode) {
    throw new Error(
      `Storefront checkout entry must be pickup-only (ADR-086 / ADR-082); got "${mode}".`,
    );
  }
}

export function assertNoDeliveryOnStorefront(feature: string): void {
  const forbidden = ["delivery", "courier", "shipping", "rider", "marketplace"];
  if (forbidden.includes(feature)) {
    throw new Error(
      `Storefront forbids "${feature}" (ADR-086). Pickup-only; no marketplace delivery.`,
    );
  }
}

export function assertStorefrontBranding(branding: StorefrontBranding): void {
  const name = branding.displayName?.trim();
  if (!name) {
    throw new Error("Storefront branding requires displayName (ADR-086).");
  }
}

export function assertStorefrontSubdomainNotRequired(mvpRequiresSubdomain: boolean): void {
  if (mvpRequiresSubdomain) {
    throw new Error(
      "MVP storefront must not require subdomains (ADR-086 / ADR-091); path URL only.",
    );
  }
}

export const STOREFRONT_ARCHITECTURE = {
  decision: STOREFRONT_ARCHITECTURE_DECISION,
  surfaces: STOREFRONT_SURFACES,
  acl: STOREFRONT_PUBLIC_ACL,
  brandingFields: STOREFRONT_BRANDING_FIELDS,
  copyFa: STOREFRONT_COPY_FA,
  pickupCta: STOREFRONT_PICKUP_CTA,
  cache: STOREFRONT_CACHE,
  events: STOREFRONT_EVENTS,
  appPaths: STOREFRONT_APP_PATHS,
  uiuxGate: STOREFRONT_UIUX_GATE,
  isForbiddenPosImport: (moduleName: string) =>
    isForbiddenUiDomainImport("storefront", moduleName),
} as const;
