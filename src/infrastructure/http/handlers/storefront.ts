/**
 * ADR-094 / ADR-100 public storefront read + pickup checkout handlers — ACL DTOs (ADR-077).
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import {
  createEnvStaticMapProvider,
  readStaticMapEnvFromProcess,
} from "../../../modules/store/domain/location/index.js";
import {
  orderDto,
  paymentDto,
  publicProductDto,
  publicStoreDto,
} from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import { enqueueDomainEvent } from "../enqueue-domain-event.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
  parseBody,
  requireIdempotencyHeader,
} from "../envelopes.js";
import { clientIp, enforceRateLimit } from "../rate-limit.js";
import { requireCustomerAuth } from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";
import type { HttpBinaryHandlerResult } from "./merchants-stores.js";

async function resolveActiveStoreBySlug(
  ctx: ApiContext,
  slug: string,
  correlationId: string,
) {
  const store = await ctx.repos.stores.findBySlug(slug);
  if (!store || store.status !== "active") {
    return {
      ok: false as const,
      result: fail({
        code: "NOT_FOUND",
        correlationId,
        status: 404,
        messageFa: "فروشگاه پیدا نشد یا غیرفعال است.",
      }),
    };
  }
  const merchant = await ctx.repos.merchants.findById(store.merchantId);
  if (!merchant || merchant.status !== "active") {
    return {
      ok: false as const,
      result: fail({
        code: "NOT_FOUND",
        correlationId,
        status: 404,
        messageFa: "فروشگاه پیدا نشد یا غیرفعال است.",
      }),
    };
  }
  return { ok: true as const, store, merchant };
}

export async function handleStorefrontProfile(
  request: HttpRequestLike,
  ctx: ApiContext,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const limited = await enforceRateLimit({
    ctx,
    request,
    scope: "public_storefront",
    subjectRaw: `${clientIp(request)}:${slug}`,
    correlationId,
  });
  if (limited) return limited;

  const resolved = await resolveActiveStoreBySlug(ctx, slug, correlationId);
  if (!resolved.ok) return resolved.result;
  return ok({
    store: publicStoreDto(resolved.store),
    merchant: {
      tradeName: resolved.merchant.tradeName,
      slug: resolved.merchant.slug,
    },
  });
}

/**
 * Proxy static map image so provider keys never reach the browser (ADR-104).
 * Returns JSON error envelope when provider missing (about UI uses address fallback).
 */
export async function handleStorefrontStaticMap(
  request: HttpRequestLike,
  ctx: ApiContext,
  slug: string,
): Promise<HttpHandlerResult | HttpBinaryHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const limited = await enforceRateLimit({
    ctx,
    request,
    scope: "public_storefront",
    subjectRaw: `${clientIp(request)}:map:${slug}`,
    correlationId,
  });
  if (limited) return limited;

  const resolved = await resolveActiveStoreBySlug(ctx, slug, correlationId);
  if (!resolved.ok) return resolved.result;

  const provider = createEnvStaticMapProvider(readStaticMapEnvFromProcess());
  const upstream = provider.buildUrl({
    latitude: resolved.store.address.latitude,
    longitude: resolved.store.address.longitude,
  });
  if (!upstream) {
    return fail({
      code: "MAP_PROVIDER_UNCONFIGURED",
      correlationId,
      status: 404,
      messageFa:
        "نقشهٔ تصویری در این محیط تنظیم نشده است. از آدرس و مسیریابی استفاده کنید.",
    });
  }

  try {
    const upstreamRes = await fetch(upstream, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstreamRes.ok) {
      return fail({
        code: "MAP_UPSTREAM_ERROR",
        correlationId,
        status: 502,
        messageFa: "دریافت تصویر نقشه ممکن نشد. آدرس مغازه را ببینید.",
      });
    }
    const contentType =
      upstreamRes.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    return {
      kind: "binary",
      status: 200,
      body: buf,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
        "X-Correlation-Id": correlationId,
      },
    };
  } catch {
    return fail({
      code: "MAP_UPSTREAM_ERROR",
      correlationId,
      status: 502,
      messageFa: "دریافت تصویر نقشه ممکن نشد. آدرس مغازه را ببینید.",
    });
  }
}

/**
 * Proxy store logo bytes from MinIO so private bucket stays opaque (ADR-111).
 */
export async function handleStorefrontLogo(
  request: HttpRequestLike,
  ctx: ApiContext,
  slug: string,
): Promise<HttpHandlerResult | HttpBinaryHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const limited = await enforceRateLimit({
    ctx,
    request,
    scope: "public_storefront",
    subjectRaw: `${clientIp(request)}:logo:${slug}`,
    correlationId,
  });
  if (limited) return limited;

  const resolved = await resolveActiveStoreBySlug(ctx, slug, correlationId);
  if (!resolved.ok) return resolved.result;

  const key = resolved.store.branding.logoObjectKey?.trim();
  if (!key || !ctx.objectStorage) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "لوگوی فروشگاه تنظیم نشده است.",
    });
  }

  const { MINIO_BUCKETS } = await import("../../minio/contracts/index.js");
  const obj = await ctx.objectStorage.getObject({
    bucket: MINIO_BUCKETS.media,
    objectKey: key,
  });
  if (!obj) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "لوگوی فروشگاه یافت نشد.",
    });
  }

  return {
    kind: "binary",
    status: 200,
    body: Buffer.from(obj.body),
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "public, max-age=300",
      "X-Correlation-Id": correlationId,
    },
  };
}

export async function handleStorefrontProducts(
  request: HttpRequestLike,
  ctx: ApiContext,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const limited = await enforceRateLimit({
    ctx,
    request,
    scope: "public_storefront",
    subjectRaw: `${clientIp(request)}:${slug}:products`,
    correlationId,
  });
  if (limited) return limited;

  const resolved = await resolveActiveStoreBySlug(ctx, slug, correlationId);
  if (!resolved.ok) return resolved.result;

  const products = await ctx.repos.products.listByMerchantId(
    resolved.store.merchantId,
  );
  const stockItems = await ctx.repos.stockItems.listByStore(
    resolved.store.merchantId,
    resolved.store.id,
  );
  const stockByProduct = new Map(
    stockItems.map((item) => [item.productId, item] as const),
  );

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const active = products.filter((p) => p.deletedAt === null);
  const filtered = q
    ? active.filter((p) => p.name.includes(q) || p.sku.includes(q))
    : active;

  return ok({
    storeId: resolved.store.id,
    fulfillment: { mode: "pickup" as const },
    products: filtered.map((product) =>
      publicProductDto(product, stockByProduct.get(product.id) ?? null),
    ),
  });
}

export async function handleStorefrontProduct(
  request: HttpRequestLike,
  ctx: ApiContext,
  slug: string,
  productId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const limited = await enforceRateLimit({
    ctx,
    request,
    scope: "public_storefront",
    subjectRaw: `${clientIp(request)}:${slug}:${productId}`,
    correlationId,
  });
  if (limited) return limited;

  const resolved = await resolveActiveStoreBySlug(ctx, slug, correlationId);
  if (!resolved.ok) return resolved.result;

  const product = await ctx.repos.products.findById(productId);
  if (
    !product ||
    product.deletedAt !== null ||
    product.merchantId !== resolved.store.merchantId
  ) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "کالا پیدا نشد.",
    });
  }

  const stock = await ctx.repos.stockItems.findByStoreProduct(
    resolved.store.merchantId,
    resolved.store.id,
    product.id,
  );

  return ok({
    storeId: resolved.store.id,
    fulfillment: { mode: "pickup" as const },
    product: publicProductDto(product, stock),
  });
}

const storefrontCreateOrderSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  consentCheckboxAccepted: z.boolean(),
  callbackUrl: z.string().url().optional(),
});

/**
 * Customer pickup checkout — creates pending_payment order + payment intent.
 * Prices and stock read from catalog/inventory (client prices are ignored).
 */
export async function handleStorefrontCreateOrder(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  const customer = requireCustomerAuth(session, correlationId);
  if (!customer.ok) return customer.result;

  const limited = await enforceRateLimit({
    ctx,
    request,
    scope: "public_storefront",
    subjectRaw: `checkout:${customer.actor.userId}:${slug}`,
    correlationId,
  });
  if (limited) return limited;

  const idem = requireIdempotencyHeader(request, correlationId);
  if (!idem.ok) return idem.result;

  const parsed = await parseBody(
    request,
    storefrontCreateOrderSchema,
    correlationId,
  );
  if (!parsed.ok) return parsed.result;

  const identities = ctx.repos.customerIdentities;
  if (!identities) {
    return fail({
      code: "SERVICE_UNAVAILABLE",
      correlationId,
      status: 503,
      messageFa: "سرویس هویت مشتری در دسترس نیست.",
    });
  }

  const resolved = await resolveActiveStoreBySlug(ctx, slug, correlationId);
  if (!resolved.ok) return resolved.result;
  const { store } = resolved;

  if (customer.actor.storeId && customer.actor.storeId !== store.id) {
    return fail({
      code: "FORBIDDEN",
      correlationId,
      status: 403,
      messageFa: "این نشست متعلق به فروشگاه دیگری است.",
    });
  }

  const identity = await identities.findById(customer.actor.userId);
  if (!identity) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "هویت مشتری یافت نشد.",
    });
  }

  let membership = await ctx.repos.storeMemberships.findByStoreAndPhone(
    store.id,
    identity.phoneNational,
  );
  if (!membership) {
    if (!parsed.data.consentCheckboxAccepted) {
      return fail({
        code: "VALIDATION_ERROR",
        correlationId,
        status: 400,
        messageFa: "برای ثبت سفارش، پذیرش عضویت فروشگاه لازم است.",
      });
    }
    const joined = await runUseCase(correlationId, () =>
      ctx.crm.joinWithDigitalConsent({
        merchantId: store.merchantId,
        storeId: store.id,
        phone: identity.phoneNational,
        source: "storefront",
        consentCheckboxAccepted: true,
      }),
    );
    if (!joined.ok) return joined.result;
    membership = joined.data.membership;
    if (joined.data.event) {
      await enqueueDomainEvent({
        outbox: ctx.outbox,
        cache: ctx.cache,
        notifications: ctx.notifications,
        domainEvent: joined.data.event,
        merchantId: store.merchantId,
        storeId: store.id,
      });
    }
  }

  const orderLines: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceMinor: bigint;
  }> = [];

  for (const line of parsed.data.lines) {
    const product = await ctx.repos.products.findById(line.productId);
    if (
      !product ||
      product.deletedAt !== null ||
      product.merchantId !== store.merchantId
    ) {
      return fail({
        code: "NOT_FOUND",
        correlationId,
        status: 404,
        messageFa: "یکی از کالاهای سبد پیدا نشد.",
      });
    }
    const stock = await ctx.repos.stockItems.findByStoreProduct(
      store.merchantId,
      store.id,
      product.id,
    );
    const available = stock?.quantity ?? 0;
    if (available < line.quantity) {
      return fail({
        code: "INSUFFICIENT_STOCK",
        correlationId,
        status: 409,
        messageFa: `موجودی «${product.name}» کافی نیست.`,
      });
    }
    orderLines.push({
      id: randomUUID(),
      productId: product.id,
      productName: product.name,
      quantity: line.quantity,
      unitPriceMinor: product.price.amountMinor,
    });
  }

  const orderRan = await runUseCase(correlationId, () =>
    ctx.ordering.createOrder({
      merchantId: store.merchantId,
      storeId: store.id,
      membershipId: membership.id,
      customerId: membership.customerId,
      idempotencyKey: idem.key,
      lines: orderLines,
      fulfillmentMode: "pickup",
    }),
  );
  if (!orderRan.ok) return orderRan.result;

  if (orderRan.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: orderRan.data.event,
      merchantId: store.merchantId,
      storeId: store.id,
    });
  }

  const paymentRan = await runUseCase(correlationId, () =>
    ctx.payments.createIntent({
      merchantId: store.merchantId,
      storeId: store.id,
      orderId: orderRan.data.order.id,
      amountMinor: orderRan.data.order.totalAmountMinor,
      idempotencyKey: `pay:${idem.key}`,
      ...(parsed.data.callbackUrl !== undefined
        ? { callbackUrl: parsed.data.callbackUrl }
        : {}),
    }),
  );
  if (!paymentRan.ok) return paymentRan.result;

  if (paymentRan.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: paymentRan.data.event,
      merchantId: store.merchantId,
      storeId: store.id,
    });
  }

  return ok(
    {
      order: orderDto(orderRan.data.order),
      payment: paymentDto(paymentRan.data.payment),
      created: orderRan.data.created,
      redirectUrl: paymentRan.data.redirectUrl,
      fulfillment: { mode: "pickup" as const },
    },
    { status: orderRan.data.created ? 201 : 200 },
  );
}
