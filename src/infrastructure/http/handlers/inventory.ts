/**
 * ADR-094 / ADR-113 inventory handlers.
 */

import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { stockItemDto, stockMovementDto } from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import { enqueueDomainEvent } from "../enqueue-domain-event.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import {
  requireMerchantPermissionResolved,
} from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const adjustSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().optional(),
  createIfMissing: z.boolean().optional(),
  merchantId: z.string().optional(),
});

export async function handleListInventory(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const storeId = new URL(request.url).searchParams.get("storeId")?.trim() ?? "";
  if (!storeId) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "شناسه فروشگاه (storeId) الزامی است.",
    });
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "inventory.read",
    resourceStoreId: storeId,
  });
  if (!auth.ok) return auth.result;
  const items = await ctx.repos.stockItems.listByStore(
    auth.actor.merchantId,
    storeId,
  );
  return ok({ items: items.map(stockItemDto) });
}

export async function handleGetInventoryProduct(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  productId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const storeId = new URL(request.url).searchParams.get("storeId")?.trim() ?? "";
  if (!storeId) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "شناسه فروشگاه (storeId) الزامی است.",
    });
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "inventory.read",
    resourceStoreId: storeId,
  });
  if (!auth.ok) return auth.result;
  const item = await ctx.repos.stockItems.findByStoreProduct(
    auth.actor.merchantId,
    storeId,
    productId,
  );
  if (!item) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  return ok({ item: stockItemDto(item) });
}

export async function handleAdjustInventory(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const parsed = await parseBody(request, adjustSchema, correlationId);
  if (!parsed.ok) return parsed.result;
  // AUTH-06: hydrate merchantId before permission gate (post-onboarding JWT may still be null).
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "inventory.write",
    bodyMerchantId: parsed.data.merchantId,
    resourceStoreId: parsed.data.storeId,
  });
  if (!auth.ok) return auth.result;
  const ran = await runUseCase(correlationId, () =>
    ctx.inventory.adjustStock({
      merchantId: auth.actor.merchantId,
      storeId: parsed.data.storeId,
      productId: parsed.data.productId,
      delta: parsed.data.delta,
      ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
      ...(parsed.data.createIfMissing !== undefined
        ? { createIfMissing: parsed.data.createIfMissing }
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
    storeId: parsed.data.storeId,
  });
  for (const syncEvent of ran.data.syncEvents) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: syncEvent,
      merchantId: auth.actor.merchantId,
      storeId: parsed.data.storeId,
    });
  }

  return ok({ item: stockItemDto(ran.data.stockItem) });
}

export async function handleListStockMovements(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const searchParams = new URL(request.url).searchParams;
  const storeId = searchParams.get("storeId")?.trim() ?? "";
  if (!storeId) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "شناسه فروشگاه (storeId) الزامی است.",
    });
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "inventory.read",
      resourceStoreId: storeId,
    },
  );
  if (!auth.ok) return auth.result;

  const productId = searchParams.get("productId")?.trim() || undefined;
  const cursor = searchParams.get("cursor")?.trim() || undefined;
  const rawLimit = searchParams.get("limit");
  const limit =
    rawLimit && !isNaN(Number(rawLimit)) ? Number(rawLimit) : undefined;

  const ran = await runUseCase(correlationId, () =>
    ctx.inventory.listStockMovements({
      merchantId: auth.actor.merchantId,
      storeId,
      ...(productId ? { productId } : {}),
      ...(cursor ? { cursor } : {}),
      ...(limit !== undefined ? { limit } : {}),
    }),
  );
  if (!ran.ok) return ran.result;

  return ok({
    items: ran.data.movements.map(stockMovementDto),
    nextCursor: ran.data.nextCursor,
  });
}
