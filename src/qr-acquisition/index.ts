/**
 * ADR-081 — QR Acquisition Architecture Decision.
 *
 * Physical QR → storefront land with `?src=qr` → OTP join / browse → membership.
 * Stable storefront URL; printable PNG/SVG in MinIO `qrcodes` bucket; attribution events.
 * NEVER put secrets/tokens/PII in QR payload.
 */

import { MEMBERSHIP_SOURCES } from "../crm-membership/index.js";
import {
  MINIO_BUCKETS,
  OBJECT_LIMITS,
  buildObjectKey,
} from "../minio-storage/index.js";
import {
  STOREFRONT_URL_POLICY,
  buildStorefrontPath,
} from "../mvp-policies/index.js";
import { STOREFRONT_EVENTS } from "../storefront-architecture/index.js";
import { isStorePubliclyVisible } from "../store-domain/index.js";
import type { StoreStatus } from "../store-domain/index.js";

export { buildStorefrontPath };

/** Binding Decision (ADR-081). */
export const QR_ACQUISITION_DECISION = {
  adr: "ADR-081",
  encodesCanonicalStorefrontUrl: true,
  sourceQuery: STOREFRONT_URL_POLICY.qrSourceQuery,
  sourceParam: "src",
  sourceValue: "qr",
  printableAssets: true,
  minioBucket: MINIO_BUCKETS.qr,
  membershipSource: "qr" as const,
  analyticsFunnel: true,
  noSecretsInQr: true,
  rationale: "growth_loop_qr",
} as const;

/** Query contract for QR payload attribution. */
export const QR_SOURCE_QUERY = {
  param: QR_ACQUISITION_DECISION.sourceParam,
  value: QR_ACQUISITION_DECISION.sourceValue,
  /** Matches ADR-091 / STOREFRONT_URL_POLICY.qrSourceQuery (`src=qr`). */
  pair: STOREFRONT_URL_POLICY.qrSourceQuery,
  /** Future campaign QR ids (ADR-081 Future Evolution) — optional only. */
  campaignParam: "cid",
} as const;

/**
 * Stability rule: regenerating the QR *image* (branding/version) must keep
 * the same destination URL so printed stickers remain valid.
 */
export const QR_URL_STABILITY = {
  destinationStableAcrossImageRegen: true,
  imageMayVersionForBranding: true,
  rule: "QR encodes stable storefront deep link; PNG/SVG may version in MinIO without changing target URL (ADR-081).",
} as const;

/** MinIO placement for printable QR binaries (never PG BLOB). */
export const QR_MINIO_STORAGE = {
  bucket: MINIO_BUCKETS.qr,
  allowedContentTypes: OBJECT_LIMITS.qrcodes.allowedContentTypes,
  maxBytes: OBJECT_LIMITS.qrcodes.maxBytes,
  storeField: "qrAssetRef",
  /** Generation lib (e.g. qrcode PNG/SVG) chosen at wiring time — contract only. */
  generationLibDeferred: true,
  rule: "Store QR PNG/SVG in MinIO qrcodes bucket; persist object key on Store.qrAssetRef (ADR-081 / ADR-040).",
} as const;

/**
 * StoreQrRef VO — object pointer for printable store QR (ARD-033 Domain Model).
 * Persist key in PG; binary lives in MinIO `qrcodes`.
 */
export type StoreQrRef = {
  bucket: typeof MINIO_BUCKETS.qr;
  objectKey: string;
  contentType: "image/png" | "image/svg+xml";
  byteSize: number;
};

export type CreateStoreQrRefInput = {
  objectKey: string;
  contentType: string;
  byteSize: number;
};

export function createStoreQrRef(input: CreateStoreQrRefInput): StoreQrRef {
  const objectKey = input.objectKey.trim();
  if (!objectKey) {
    throw new Error("StoreQrRef.objectKey must be non-empty (ADR-081).");
  }
  if (
    !(OBJECT_LIMITS.qrcodes.allowedContentTypes as readonly string[]).includes(
      input.contentType,
    )
  ) {
    throw new Error(
      `StoreQrRef contentType not allowed (ADR-081 / ADR-040): ${input.contentType}`,
    );
  }
  if (
    !Number.isFinite(input.byteSize) ||
    input.byteSize <= 0 ||
    input.byteSize > OBJECT_LIMITS.qrcodes.maxBytes
  ) {
    throw new Error(
      `StoreQrRef.byteSize out of range (ADR-081); max ${OBJECT_LIMITS.qrcodes.maxBytes}.`,
    );
  }
  return {
    bucket: MINIO_BUCKETS.qr,
    objectKey,
    contentType: input.contentType as StoreQrRef["contentType"],
    byteSize: input.byteSize,
  };
}

/** Merchant-scoped MinIO key for a store QR asset. */
export function buildStoreQrObjectKey(parts: {
  merchantId: string;
  storeId: string;
  filename: string;
}): string {
  return buildObjectKey({
    merchantId: parts.merchantId,
    storeId: parts.storeId,
    kind: MINIO_BUCKETS.qr,
    filename: parts.filename,
  });
}

/**
 * Growth-loop attribution events (emit via analytics ADRs later).
 * @see docs/product/growth-loops-qr.md
 */
export const QR_ACQUISITION_EVENTS = {
  generated: "StoreQrGenerated",
  storefrontVisited: STOREFRONT_EVENTS.visited,
  membershipCreated: "MembershipCreated",
  attributionSource: "qr" as const,
} as const;

/** Reserved HTTP surface (handlers later / ARD-033). */
export const QR_ACQUISITION_API = {
  getQr: "/api/v1/stores/:id/qr",
  regenerateQr: "/api/v1/stores/:id/qr/regenerate",
} as const;

/**
 * Iranian physical sticker placement notes (merchant-facing guidance).
 * Print UI page deferred — copy is ready for ARD-033 merchant surface.
 */
export const QR_STICKER_PRINT_NOTES_FA = {
  title: "راهنمای برچسب QR فروشگاه",
  window: "برچسب را روی ویترین در ارتفاع دید مشتری بچسبانید.",
  counter: "یک نسخه روی پیشخوان نزدیک صندوق نگه دارید.",
  glare:
    "از پوشش مات یا محل کم‌انعکاس استفاده کنید تا در نور روز خوانا بماند.",
  size: "حداقل اندازهٔ چاپ طوری باشد که از فاصلهٔ یک متری راحت اسکن شود.",
  ctaOnSticker: "متن فارسی کوتاه روی برچسب: «اسکن کنید — عضویت و سفارش حضوری»",
  regenerateNote:
    "بازنشر تصویر QR مقصد را عوض نمی‌کند؛ برچسب‌های قبلی همچنان کار می‌کنند.",
} as const;

/** First-run copy when customer lands from QR (`?src=qr`) on storefront. */
export const QR_LANDING_COPY_FA = {
  welcome: "به فروشگاه خوش آمدید",
  hint: "از طریق QR وارد شدید — عضویت با پیامک و سفارش حضوری (پیکاپ).",
  joinCta: "عضویت در باشگاه مشتریان",
  browseCta: "مشاهدهٔ کاتالوگ",
  minTouchTargetPx: 44,
  lang: "fa" as const,
  dir: "rtl" as const,
} as const;

/** Security constraints for QR payload content. */
export const QR_SECURITY = {
  noSecrets: true,
  noTokens: true,
  noPii: true,
  forbiddenPayloadFragments: [
    "token=",
    "access_token",
    "refresh_token",
    "password",
    "api_key",
    "authorization",
  ] as const,
  storeMustBeActiveForPublicScan: true,
  rule: "QR must encode only the public storefront URL (+ src=qr); never secrets or PII (ADR-081).",
} as const;

export type BuildQrTargetUrlOptions = {
  /** Absolute origin, e.g. https://app.example.com — omit for path-only. */
  origin?: string;
  /** Future campaign id — appended as `cid` without replacing `src=qr`. */
  campaignId?: string;
};

/**
 * Canonical QR target: storefront path + `?src=qr`.
 * Uses `buildStorefrontPath` (ADR-091 / ADR-006) so slug URL stays single-sourced.
 */
export function buildQrTargetUrl(
  storeSlug: string,
  options: BuildQrTargetUrlOptions = {},
): string {
  const path = buildStorefrontPath(storeSlug);
  const params = new URLSearchParams();
  params.set(QR_SOURCE_QUERY.param, QR_SOURCE_QUERY.value);
  const campaign = options.campaignId?.trim();
  if (campaign) {
    params.set(QR_SOURCE_QUERY.campaignParam, campaign);
  }
  const relative = `${path}?${params.toString()}`;
  const origin = options.origin?.trim().replace(/\/$/, "");
  return origin ? `${origin}${relative}` : relative;
}

/** True when URL/search carries QR acquisition attribution. */
export function hasQrAcquisitionSource(
  search: string | URLSearchParams,
): boolean {
  const params =
    typeof search === "string"
      ? new URLSearchParams(
          search.startsWith("?") ? search.slice(1) : search,
        )
      : search;
  return params.get(QR_SOURCE_QUERY.param) === QR_SOURCE_QUERY.value;
}

/**
 * Assert QR payload has no secrets/tokens and encodes our attribution query.
 */
export function assertQrPayloadSafe(payload: string): void {
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new Error("QR payload must be non-empty (ADR-081).");
  }
  const lower = trimmed.toLowerCase();
  for (const fragment of QR_SECURITY.forbiddenPayloadFragments) {
    if (lower.includes(fragment)) {
      throw new Error(
        `QR payload must not contain secrets/tokens (ADR-081): found "${fragment}".`,
      );
    }
  }
  let search = "";
  try {
    if (trimmed.includes("://")) {
      search = new URL(trimmed).search;
    } else {
      const q = trimmed.indexOf("?");
      search = q >= 0 ? trimmed.slice(q) : "";
    }
  } catch {
    throw new Error("QR payload must be a valid URL (ADR-081).");
  }
  if (!hasQrAcquisitionSource(search)) {
    throw new Error(
      `QR payload must include ${QR_SOURCE_QUERY.pair} (ADR-081).`,
    );
  }
}

/** Public scan attribution only when store is active. */
export function assertStoreScannable(status: StoreStatus): void {
  if (!isStorePubliclyVisible(status)) {
    throw new Error(
      "Store must be active for public QR scan attribution (ADR-081).",
    );
  }
}

/** Membership join from QR must record source=qr (ADR-007 / growth-loops-qr). */
export function assertQrMembershipSource(source: string): void {
  if (source !== QR_ACQUISITION_EVENTS.attributionSource) {
    throw new Error(
      `QR membership joins must use source="${QR_ACQUISITION_EVENTS.attributionSource}" (ADR-081 / ADR-007).`,
    );
  }
  if (!(MEMBERSHIP_SOURCES as readonly string[]).includes(source)) {
    throw new Error(`Unknown membership source "${source}" (ADR-007).`);
  }
}

export const QR_ACQUISITION = {
  decision: QR_ACQUISITION_DECISION,
  sourceQuery: QR_SOURCE_QUERY,
  urlStability: QR_URL_STABILITY,
  minio: QR_MINIO_STORAGE,
  events: QR_ACQUISITION_EVENTS,
  api: QR_ACQUISITION_API,
  stickerNotesFa: QR_STICKER_PRINT_NOTES_FA,
  landingCopyFa: QR_LANDING_COPY_FA,
  security: QR_SECURITY,
} as const;
