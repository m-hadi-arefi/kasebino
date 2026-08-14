/**
 * ADR-094 / ADR-113 / ADR-104 merchant + store handlers.
 */

import { z } from "zod";

import {
  activeStoreSetCookieHeader,
  parseActiveStoreCookie,
} from "../../auth/active-store.js";
import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import {
  generateStoreQrPng,
  resolvePublicAppOrigin,
} from "../../../store-location/qr-png.js";
import { merchantDto, storeDto } from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import {
  hydrateMerchantSessionClaims,
  requireMerchantPermissionResolved,
} from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const geoNumber = z.number().finite();

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().nullable().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().nullable().optional(),
  displayAddress: z.string().optional(),
  latitude: geoNumber.refine((v) => v >= -90 && v <= 90, {
    message: "latitude_out_of_range",
  }),
  longitude: geoNumber.refine((v) => v >= -180 && v <= 180, {
    message: "longitude_out_of_range",
  }),
});

const createMerchantSchema = z.object({
  tradeName: z.string().min(1),
  slug: z.string().min(1),
  contactPhone: z.string().nullable().optional(),
});

const updateMerchantSchema = z.object({
  tradeName: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  contactPhone: z.string().nullable().optional(),
});

const createStoreSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  address: addressSchema,
  primaryColor: z.string().nullable().optional(),
  logoObjectKey: z.string().nullable().optional(),
  merchantId: z.string().optional(),
});

const dayHoursSchema = z
  .object({
    open: z.string().min(1),
    close: z.string().min(1),
  })
  .nullable();

const hoursSchema = z.object({
  saturday: dayHoursSchema.optional(),
  sunday: dayHoursSchema.optional(),
  monday: dayHoursSchema.optional(),
  tuesday: dayHoursSchema.optional(),
  wednesday: dayHoursSchema.optional(),
  thursday: dayHoursSchema.optional(),
  friday: dayHoursSchema.optional(),
});

const updateStoreSchema = z.object({
  address: addressSchema.optional(),
  displayName: z.string().min(1).optional(),
  primaryColor: z.string().nullable().optional(),
  logoObjectKey: z.string().nullable().optional(),
  hours: hoursSchema.optional(),
});

export type HttpBinaryHandlerResult = {
  kind: "binary";
  status: number;
  body: Buffer;
  headers: Record<string, string>;
};

export async function handleCreateMerchant(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  // Onboarding: allow authenticated user without merchantId yet — fall back to body owner from session user.
  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId) {
    return fail({ code: "UNAUTHORIZED", correlationId, status: 401 });
  }
  const parsed = await parseBody(request, createMerchantSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.merchants.createMerchant({
      tradeName: parsed.data.tradeName,
      slug: parsed.data.slug,
      ownerUserId: userId,
      ...(parsed.data.contactPhone !== undefined
        ? { contactPhone: parsed.data.contactPhone }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ merchant: merchantDto(ran.data.merchant) }, { status: 201 });
}

export async function handleGetMerchantMe(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "merchant.read" },
  );
  if (!auth.ok) return auth.result;
  const merchant = await ctx.repos.merchants.findById(auth.actor.merchantId);
  if (!merchant) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  return ok({ merchant: merchantDto(merchant) });
}

export async function handleUpdateMerchantMe(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "PATCH") {
    return methodNotAllowed(correlationId, "PATCH");
  }
  const gate = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "merchant.write" },
  );
  if (!gate.ok) return gate.result;
  const parsed = await parseBody(request, updateMerchantSchema, correlationId);
  if (!parsed.ok) return parsed.result;
  const ran = await runUseCase(correlationId, () =>
    ctx.merchants.updateSettings({
      merchantId: gate.actor.merchantId,
      ...(parsed.data.tradeName !== undefined
        ? { tradeName: parsed.data.tradeName }
        : {}),
      ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.contactPhone !== undefined
        ? { contactPhone: parsed.data.contactPhone }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ merchant: merchantDto(ran.data.merchant) });
}

export async function handleListStores(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "merchant.read" },
  );
  if (!auth.ok) return auth.result;
  const stores = await ctx.repos.stores.listByMerchantId(auth.actor.merchantId);
  return ok({ stores: stores.map(storeDto) });
}

export async function handleCreateStore(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const parsed = await parseBody(request, createStoreSchema, correlationId);
  if (!parsed.ok) return parsed.result;
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "store.write",
      bodyMerchantId: parsed.data.merchantId,
    },
  );
  if (!auth.ok) return auth.result;
  const ran = await runUseCase(correlationId, () =>
    ctx.stores.createStore({
      merchantId: auth.actor.merchantId,
      slug: parsed.data.slug,
      displayName: parsed.data.displayName,
      address: {
        line1: parsed.data.address.line1,
        city: parsed.data.address.city,
        province: parsed.data.address.province,
        latitude: parsed.data.address.latitude,
        longitude: parsed.data.address.longitude,
        ...(parsed.data.address.line2 !== undefined
          ? { line2: parsed.data.address.line2 }
          : {}),
        ...(parsed.data.address.postalCode !== undefined
          ? { postalCode: parsed.data.address.postalCode }
          : {}),
        ...(parsed.data.address.displayAddress !== undefined
          ? { displayAddress: parsed.data.address.displayAddress }
          : {}),
      },
      ...(parsed.data.primaryColor !== undefined
        ? { primaryColor: parsed.data.primaryColor }
        : {}),
      ...(parsed.data.logoObjectKey !== undefined
        ? { logoObjectKey: parsed.data.logoObjectKey }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ store: storeDto(ran.data.store) }, { status: 201 });
}

export async function handleGetStore(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  storeId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "merchant.read",
      resourceStoreId: storeId,
    },
  );
  if (!auth.ok) return auth.result;
  const store = await ctx.repos.stores.findById(storeId);
  if (!store || store.merchantId !== auth.actor.merchantId) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  return ok({ store: storeDto(store) });
}

export async function handleUpdateStore(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  storeId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "PATCH") {
    return methodNotAllowed(correlationId, "PATCH");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "store.write",
      resourceStoreId: storeId,
    },
  );
  if (!auth.ok) return auth.result;
  const store = await ctx.repos.stores.findById(storeId);
  if (!store || store.merchantId !== auth.actor.merchantId) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  const parsed = await parseBody(request, updateStoreSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  let current = store;
  if (parsed.data.address) {
    const ran = await runUseCase(correlationId, () =>
      ctx.stores.updateAddress({
        storeId,
        address: {
          line1: parsed.data.address!.line1,
          city: parsed.data.address!.city,
          province: parsed.data.address!.province,
          latitude: parsed.data.address!.latitude,
          longitude: parsed.data.address!.longitude,
          ...(parsed.data.address!.line2 !== undefined
            ? { line2: parsed.data.address!.line2 }
            : {}),
          ...(parsed.data.address!.postalCode !== undefined
            ? { postalCode: parsed.data.address!.postalCode }
            : {}),
          ...(parsed.data.address!.displayAddress !== undefined
            ? { displayAddress: parsed.data.address!.displayAddress }
            : {}),
        },
      }),
    );
    if (!ran.ok) return ran.result;
    current = ran.data.store;
  }

  if (parsed.data.hours !== undefined) {
    const ran = await runUseCase(correlationId, () =>
      ctx.stores.updateHours({
        storeId,
        hours: {
          saturday:
            parsed.data.hours!.saturday !== undefined
              ? parsed.data.hours!.saturday
              : current.hours.saturday,
          sunday:
            parsed.data.hours!.sunday !== undefined
              ? parsed.data.hours!.sunday
              : current.hours.sunday,
          monday:
            parsed.data.hours!.monday !== undefined
              ? parsed.data.hours!.monday
              : current.hours.monday,
          tuesday:
            parsed.data.hours!.tuesday !== undefined
              ? parsed.data.hours!.tuesday
              : current.hours.tuesday,
          wednesday:
            parsed.data.hours!.wednesday !== undefined
              ? parsed.data.hours!.wednesday
              : current.hours.wednesday,
          thursday:
            parsed.data.hours!.thursday !== undefined
              ? parsed.data.hours!.thursday
              : current.hours.thursday,
          friday:
            parsed.data.hours!.friday !== undefined
              ? parsed.data.hours!.friday
              : current.hours.friday,
        },
      }),
    );
    if (!ran.ok) return ran.result;
    current = ran.data.store;
  }

  if (
    parsed.data.displayName !== undefined ||
    parsed.data.primaryColor !== undefined ||
    parsed.data.logoObjectKey !== undefined
  ) {
    const ran = await runUseCase(correlationId, () =>
      ctx.stores.updateBranding({
        storeId,
        ...(parsed.data.displayName !== undefined
          ? { displayName: parsed.data.displayName }
          : {}),
        ...(parsed.data.primaryColor !== undefined
          ? { primaryColor: parsed.data.primaryColor }
          : {}),
        ...(parsed.data.logoObjectKey !== undefined
          ? { logoObjectKey: parsed.data.logoObjectKey }
          : {}),
      }),
    );
    if (!ran.ok) return ran.result;
    current = ran.data.store;
  }

  return ok({ store: storeDto(current) });
}

export async function handleActivateStore(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  storeId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "store.write",
      resourceStoreId: storeId,
    },
  );
  if (!auth.ok) return auth.result;
  const store = await ctx.repos.stores.findById(storeId);
  if (!store || store.merchantId !== auth.actor.merchantId) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  const ran = await runUseCase(correlationId, () =>
    ctx.stores.activateStore({ storeId }),
  );
  if (!ran.ok) return ran.result;
  return ok({ store: storeDto(ran.data.store) });
}

export async function handleGetStoreQr(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  storeId: string,
): Promise<HttpHandlerResult | HttpBinaryHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "merchant.read",
      resourceStoreId: storeId,
    },
  );
  if (!auth.ok) return auth.result;
  const store = await ctx.repos.stores.findById(storeId);
  if (!store || store.merchantId !== auth.actor.merchantId) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "فروشگاه یافت نشد.",
    });
  }

  const accept = request.headers.get("accept") ?? "";
  const wantsJson = accept.includes("application/json");
  const origin = resolvePublicAppOrigin(request.url);
  const qr = await generateStoreQrPng({
    storeSlug: store.slug,
    ...(origin ? { origin } : {}),
  });

  if (wantsJson) {
    return ok({
      storeId: store.id,
      slug: store.slug,
      targetUrl: qr.targetUrl,
      contentType: qr.contentType,
      pngBase64: qr.png.toString("base64"),
      imagePath: `/api/v1/stores/${encodeURIComponent(store.id)}/qr`,
    });
  }

  return {
    kind: "binary",
    status: 200,
    body: qr.png,
    headers: {
      "Content-Type": qr.contentType,
      "Cache-Control": "private, max-age=300",
      "X-Mos-Qr-Target": qr.targetUrl,
      "X-Correlation-Id": correlationId,
    },
  };
}

/**
 * POST /api/v1/stores/{id}/assets — multipart branding upload (ADR-111).
 * Expects JSON body with base64 image for App Router simplicity:
 * `{ kind: "logo"|"icon", contentType, dataBase64, filename? }`
 */
export async function handleUploadStoreAssets(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  storeId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "store.write",
      resourceStoreId: storeId,
    },
  );
  if (!auth.ok) return auth.result;

  if (!ctx.storeAssets || !ctx.objectStorage) {
    return fail({
      code: "INTERNAL_ERROR",
      correlationId,
      status: 503,
      messageFa: "ذخیره‌سازی فایل در دسترس نیست.",
    });
  }

  const assetSchema = z.object({
    kind: z.enum(["logo", "icon"]),
    contentType: z.string().min(1),
    dataBase64: z.string().min(1),
    filename: z.string().optional(),
  });
  const parsed = await parseBody(request, assetSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const store = await ctx.repos.stores.findById(storeId);
  if (!store || store.merchantId !== auth.actor.merchantId) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "فروشگاه یافت نشد.",
    });
  }

  let body: Uint8Array;
  try {
    body = Uint8Array.from(Buffer.from(parsed.data.dataBase64, "base64"));
  } catch {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "داده تصویر نامعتبر است.",
    });
  }

  const { ObjectValidationError } = await import(
    "../../../minio-storage/index.js"
  );
  try {
    const result = await ctx.storeAssets.uploadBrandingAsset({
      merchantId: auth.actor.merchantId,
      storeId,
      kind: parsed.data.kind,
      body,
      contentType: parsed.data.contentType,
      ...(parsed.data.filename !== undefined
        ? { filename: parsed.data.filename }
        : {}),
    });
    return ok(
      {
        store: storeDto(result.store),
        asset: {
          kind: result.kind,
          objectKey: result.objectKey,
          logoUrl: `/api/v1/storefront/${encodeURIComponent(result.store.slug)}/logo`,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ObjectValidationError) {
      const messageFa =
        err.code === "content_type_not_allowed"
          ? "نوع فایل مجاز نیست. از PNG، JPEG، WebP یا GIF استفاده کنید (SVG مجاز نیست)."
          : err.code === "size_exceeded"
            ? "حجم تصویر بیش از حد مجاز است (حداکثر ۲ مگابایت)."
            : "فایل نامعتبر است.";
      return fail({
        code: "VALIDATION_ERROR",
        correlationId,
        status: 400,
        messageFa,
      });
    }
    return fail({
      code: "INTERNAL_ERROR",
      correlationId,
      status: 500,
      messageFa: "بارگذاری دارایی برندینگ ناموفق بود.",
    });
  }
}

const setActiveStoreSchema = z.object({
  storeId: z.string().min(1),
});

function isSecureRequest(request: HttpRequestLike): boolean {
  try {
    const url = new URL(request.url);
    return url.protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

/** GET /api/v1/stores/active — cookie + owned stores. */
export async function handleGetActiveStore(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "merchant.read" },
  );
  if (!auth.ok) return auth.result;

  const stores = await ctx.repos.stores.listByMerchantId(auth.actor.merchantId);
  const cookieStoreId = parseActiveStoreCookie(request.headers.get("cookie"));
  const fromCookie = cookieStoreId
    ? stores.find((s) => s.id === cookieStoreId) ?? null
    : null;
  const active = fromCookie ?? stores[0] ?? null;

  return ok({
    activeStoreId: active?.id ?? null,
    store: active ? storeDto(active) : null,
    stores: stores.map(storeDto),
  });
}

/** PUT /api/v1/stores/active — set active-store cookie (owned store only). */
export async function handleSetActiveStore(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "PUT" && request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "PUT");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "merchant.read" },
  );
  if (!auth.ok) return auth.result;

  const parsed = await parseBody(request, setActiveStoreSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const store = await ctx.repos.stores.findById(parsed.data.storeId);
  if (!store || store.merchantId !== auth.actor.merchantId) {
    return fail({
      code: "FORBIDDEN",
      correlationId,
      status: 403,
      messageFa: "فروشگاه انتخاب‌شده متعلق به کسب‌وکار شما نیست.",
    });
  }

  return ok(
    {
      activeStoreId: store.id,
      store: storeDto(store),
    },
    {
      headers: {
        "Set-Cookie": activeStoreSetCookieHeader(
          store.id,
          isSecureRequest(request),
        ),
      },
    },
  );
}

/**
 * GET /api/v1/merchants/me/onboarding — resume wizard + activation checklist (J1).
 */
export async function handleGetOnboardingStatus(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }

  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId) {
    return fail({ code: "UNAUTHORIZED", correlationId, status: 401 });
  }

  const hydrated = await hydrateMerchantSessionClaims(session, ctx.repos.merchants);
  const merchantId =
    hydrated?.merchantId ??
    hydrated?.user?.merchantId ??
    null;
  const merchant = merchantId
    ? await ctx.repos.merchants.findById(merchantId)
    : await ctx.repos.merchants.findByOwnerUserId(userId);

  if (!merchant) {
    return ok({
      step: "merchant" as const,
      complete: false,
      merchant: null,
      store: null,
      storefrontPath: null,
      checklist: {
        merchantCreated: false,
        storeWithGeo: false,
        brandingReady: false,
        storefrontReady: false,
        firstSaleWithPhone: false,
      },
      slugPolicy: "immutable_after_publish" as const,
    });
  }

  const stores = await ctx.repos.stores.listByMerchantId(merchant.id);
  const store = stores[0] ?? null;
  const storeWithGeo = Boolean(
    store &&
      store.address.line1?.trim() &&
      store.address.city?.trim() &&
      store.address.province?.trim() &&
      Number.isFinite(store.address.latitude) &&
      Number.isFinite(store.address.longitude),
  );
  const brandingReady = Boolean(
    store &&
      (store.branding.primaryColor || store.branding.logoObjectKey),
  );
  const storefrontReady = Boolean(store?.slug);
  const storefrontPath = store ? `/s/${store.slug}` : null;

  let step: "merchant" | "store" | "branding" | "ready" = "ready";
  if (!storeWithGeo) step = "store";
  else if (!brandingReady) step = "branding";
  else step = "ready";

  return ok({
    step,
    complete: storeWithGeo && storefrontReady,
    merchant: merchantDto(merchant),
    store: store ? storeDto(store) : null,
    stores: stores.map(storeDto),
    storefrontPath,
    checklist: {
      merchantCreated: true,
      storeWithGeo,
      brandingReady,
      storefrontReady,
      /** UI tracks; live SaleCompleted with phone is success metric (FR-6). */
      firstSaleWithPhone: false,
    },
    slugPolicy: "immutable_after_publish" as const,
  });
}

/**
 * POST /api/v1/merchants/me/onboarding/complete — activate merchant + primary store.
 */
export async function handleCompleteOnboarding(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "store.write" },
  );
  if (!auth.ok) return auth.result;

  const merchant = await ctx.repos.merchants.findById(auth.actor.merchantId);
  if (!merchant) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "کسب‌وکار یافت نشد.",
    });
  }

  const stores = await ctx.repos.stores.listByMerchantId(merchant.id);
  const store = stores[0];
  if (!store) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "ابتدا فروشگاه با آدرس و مختصات بسازید.",
    });
  }

  if (merchant.status === "draft") {
    const ran = await runUseCase(correlationId, () =>
      ctx.merchants.activateMerchant({ merchantId: merchant.id }),
    );
    if (!ran.ok) return ran.result;
  }

  let activeStore = store;
  if (store.status !== "active") {
    const ran = await runUseCase(correlationId, () =>
      ctx.stores.activateStore({ storeId: store.id }),
    );
    if (!ran.ok) return ran.result;
    activeStore = ran.data.store;
  }

  const refreshed = await ctx.repos.merchants.findById(merchant.id);
  return ok(
    {
      merchant: merchantDto(refreshed ?? merchant),
      store: storeDto(activeStore),
      storefrontPath: `/s/${activeStore.slug}`,
    },
    {
      headers: {
        "Set-Cookie": activeStoreSetCookieHeader(
          activeStore.id,
          isSecureRequest(request),
        ),
      },
    },
  );
}

export function isHttpBinaryResult(
  result: HttpHandlerResult | HttpBinaryHandlerResult,
): result is HttpBinaryHandlerResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "kind" in result &&
    (result as HttpBinaryHandlerResult).kind === "binary"
  );
}
