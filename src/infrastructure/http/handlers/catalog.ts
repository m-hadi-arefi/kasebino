/**
 * ADR-094 / ADR-097 / ADR-113 catalog handlers — merchant catalog reads/writes.
 */

import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { categoryDto, productDto } from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import { enqueueDomainEvent } from "../enqueue-domain-event.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import { requireMerchantPermissionResolved } from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().min(1),
  priceAmountMinor: z.union([z.number().int().nonnegative(), z.string()]),
  description: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  merchantId: z.string().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().min(1),
  priceAmountMinor: z.union([z.number().int().nonnegative(), z.string()]),
  description: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  merchantId: z.string().optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1),
  merchantId: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1),
  merchantId: z.string().optional(),
});

function parsePriceMinor(
  priceRaw: number | string,
): bigint {
  return typeof priceRaw === "string" ? BigInt(priceRaw) : BigInt(priceRaw);
}

export async function handleListProducts(
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
    {
    permission: "merchant.read",
  });
  if (!auth.ok) return auth.result;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q) {
    const ran = await runUseCase(correlationId, () =>
      ctx.catalog.searchByName({
        merchantId: auth.actor.merchantId,
        query: q,
      }),
    );
    if (!ran.ok) return ran.result;
    return ok({ products: ran.data.products.map(productDto) });
  }

  const products = await ctx.repos.products.listByMerchantId(
    auth.actor.merchantId,
  );
  return ok({
    products: products.filter((p) => p.deletedAt === null).map(productDto),
  });
}

export async function handleGetProduct(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  productId: string,
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
  });
  if (!auth.ok) return auth.result;

  const product = await ctx.repos.products.findById(productId);
  if (
    !product ||
    product.merchantId !== auth.actor.merchantId ||
    product.deletedAt !== null
  ) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  return ok({ product: productDto(product) });
}

export async function handleCreateProduct(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  const gate = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
  });
  if (!gate.ok) return gate.result;

  const parsed = await parseBody(request, createProductSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
    bodyMerchantId: parsed.data.merchantId,
  });
  if (!auth.ok) return auth.result;

  const priceAmountMinor = parsePriceMinor(parsed.data.priceAmountMinor);

  const ran = await runUseCase(correlationId, () =>
    ctx.catalog.createProduct({
      merchantId: auth.actor.merchantId,
      name: parsed.data.name,
      sku: parsed.data.sku,
      barcode: parsed.data.barcode,
      priceAmountMinor,
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.categoryId !== undefined
        ? { categoryId: parsed.data.categoryId }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;

  await enqueueDomainEvent({
    outbox: ctx.outbox,
    cache: ctx.cache,
    notifications: ctx.notifications,
    domainEvent: ran.data.event,
    merchantId: auth.actor.merchantId,
  });

  return ok(
    {
      product: productDto(ran.data.product),
      priceDisplayToman: ran.data.priceDisplayToman,
    },
    { status: 201 },
  );
}

export async function handleUpdateProduct(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  productId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "PATCH" && request.method.toUpperCase() !== "PUT") {
    return methodNotAllowed(correlationId, "PATCH, PUT");
  }

  const gate = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
  });
  if (!gate.ok) return gate.result;

  const parsed = await parseBody(request, updateProductSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
    bodyMerchantId: parsed.data.merchantId,
  });
  if (!auth.ok) return auth.result;

  const priceAmountMinor = parsePriceMinor(parsed.data.priceAmountMinor);

  const ran = await runUseCase(correlationId, () =>
    ctx.catalog.updateProduct({
      productId,
      merchantId: auth.actor.merchantId,
      name: parsed.data.name,
      sku: parsed.data.sku,
      barcode: parsed.data.barcode,
      priceAmountMinor,
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.categoryId !== undefined
        ? { categoryId: parsed.data.categoryId }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;

  await enqueueDomainEvent({
    outbox: ctx.outbox,
    cache: ctx.cache,
    notifications: ctx.notifications,
    domainEvent: ran.data.event,
    merchantId: auth.actor.merchantId,
  });

  return ok({
    product: productDto(ran.data.product),
    priceDisplayToman: ran.data.priceDisplayToman,
  });
}

export async function handleLookupProductByBarcode(
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
    {
    permission: "merchant.read",
  });
  if (!auth.ok) return auth.result;
  const barcode = new URL(request.url).searchParams.get("barcode") ?? "";
  const ran = await runUseCase(correlationId, () =>
    ctx.catalog.lookupByBarcode({
      merchantId: auth.actor.merchantId,
      barcode,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    product: ran.data.product ? productDto(ran.data.product) : null,
  });
}

export async function handleDeleteProduct(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  productId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "DELETE") {
    return methodNotAllowed(correlationId, "DELETE");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
  });
  if (!auth.ok) return auth.result;

  const existing = await ctx.repos.products.findById(productId);
  if (!existing || existing.merchantId !== auth.actor.merchantId) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
    });
  }

  const ran = await runUseCase(correlationId, () =>
    ctx.catalog.softDeleteProductById({ productId }),
  );
  if (!ran.ok) return ran.result;

  await enqueueDomainEvent({
    outbox: ctx.outbox,
    cache: ctx.cache,
    notifications: ctx.notifications,
    domainEvent: ran.data.event,
    merchantId: auth.actor.merchantId,
  });

  return ok({ product: productDto(ran.data.product) });
}

export async function handleListCategories(
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
    {
    permission: "merchant.read",
  });
  if (!auth.ok) return auth.result;
  const categories = await ctx.repos.categories.listByMerchantId(
    auth.actor.merchantId,
  );
  return ok({ categories: categories.map(categoryDto) });
}

export async function handleCreateCategory(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  const gate = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
  });
  if (!gate.ok) return gate.result;

  const parsed = await parseBody(request, createCategorySchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
    bodyMerchantId: parsed.data.merchantId,
  });
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.catalog.createCategory({
      merchantId: auth.actor.merchantId,
      name: parsed.data.name,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ category: categoryDto(ran.data.category) }, { status: 201 });
}

export async function handleUpdateCategory(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  categoryId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "PATCH" && request.method.toUpperCase() !== "PUT") {
    return methodNotAllowed(correlationId, "PATCH, PUT");
  }

  const gate = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
  });
  if (!gate.ok) return gate.result;

  const parsed = await parseBody(request, updateCategorySchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
    bodyMerchantId: parsed.data.merchantId,
  });
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.catalog.updateCategoryById({
      categoryId,
      merchantId: auth.actor.merchantId,
      name: parsed.data.name,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ category: categoryDto(ran.data.category) });
}

export async function handleDeleteCategory(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  categoryId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "DELETE") {
    return methodNotAllowed(correlationId, "DELETE");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.write",
  });
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.catalog.softDeleteCategoryById({
      categoryId,
      merchantId: auth.actor.merchantId,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ category: categoryDto(ran.data.category) });
}
