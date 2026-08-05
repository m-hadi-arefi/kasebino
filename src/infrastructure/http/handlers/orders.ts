/**
 * ADR-094 / ADR-113 ordering handlers — pickup-only (no delivery endpoints).
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { orderDto } from "../dtos.js";
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
import {
  requireCustomerAuth,
  requireMerchantAuth,
  requireMerchantPermissionResolved,
} from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";
import { refundLinkedPaymentForOrder } from "./payments.js";

const createOrderSchema = z.object({
  storeId: z.string().min(1),
  membershipId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        productName: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPriceMinor: z.union([z.number().int().nonnegative(), z.string()]),
      }),
    )
    .min(1),
  fulfillmentMode: z.literal("pickup").optional(),
  merchantId: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

async function assertOrderTenant(
  ctx: ApiContext,
  orderId: string,
  merchantId: string,
  correlationId: string,
) {
  const order = await ctx.repos.orders.findById(orderId);
  if (!order || order.merchantId !== merchantId) {
    return {
      ok: false as const,
      result: fail({ code: "NOT_FOUND", correlationId, status: 404 }),
    };
  }
  return { ok: true as const, order };
}

export async function handleCreateOrder(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  const merchantSession = requireMerchantAuth(session, correlationId);
  const customer = requireCustomerAuth(session, correlationId);
  if (!merchantSession.ok && !customer.ok) {
    return merchantSession.result;
  }

  const idem = requireIdempotencyHeader(request, correlationId);
  if (!idem.ok) return idem.result;

  const parsed = await parseBody(request, createOrderSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  let merchantId: string;
  if (merchantSession.ok) {
    const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "pickup.manage",
      bodyMerchantId: parsed.data.merchantId,
      resourceStoreId: parsed.data.storeId,
    });
    if (!auth.ok) return auth.result;
    merchantId = auth.actor.merchantId;
  } else {
    // Customer: resolve merchant from store
    const store = await ctx.repos.stores.findById(parsed.data.storeId);
    if (!store) {
      return fail({ code: "NOT_FOUND", correlationId, status: 404 });
    }
    if (
      customer.ok &&
      customer.actor.storeId &&
      customer.actor.storeId !== store.id
    ) {
      return fail({
        code: "FORBIDDEN",
        correlationId,
        status: 403,
      });
    }
    merchantId = store.merchantId;
  }

  const ran = await runUseCase(correlationId, () =>
    ctx.ordering.createOrder({
      merchantId,
      storeId: parsed.data.storeId,
      idempotencyKey: idem.key,
      lines: parsed.data.lines.map((line) => ({
        id: randomUUID(),
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceMinor:
          typeof line.unitPriceMinor === "string"
            ? BigInt(line.unitPriceMinor)
            : BigInt(line.unitPriceMinor),
      })),
      ...(parsed.data.membershipId !== undefined
        ? { membershipId: parsed.data.membershipId }
        : {}),
      ...(parsed.data.customerId !== undefined
        ? { customerId: parsed.data.customerId }
        : {}),
      fulfillmentMode: "pickup",
    }),
  );
  if (!ran.ok) return ran.result;
  return ok(
    { order: orderDto(ran.data.order), created: ran.data.created },
    { status: ran.data.created ? 201 : 200 },
  );
}

export async function handleListOrders(
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
    permission: "pickup.manage",
    resourceStoreId: storeId,
  });
  if (!auth.ok) return auth.result;
  const ran = await runUseCase(correlationId, () =>
    ctx.ordering.listStoreOrders({
      merchantId: auth.actor.merchantId,
      storeId,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ orders: ran.data.map(orderDto) });
}

export async function handleGetOrder(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  orderId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const merchantSession = requireMerchantAuth(session, correlationId);
  if (merchantSession.ok) {
    const scoped = await assertOrderTenant(
      ctx,
      orderId,
      merchantSession.actor.merchantId,
      correlationId,
    );
    if (!scoped.ok) return scoped.result;
    const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "pickup.manage",
      resourceStoreId: scoped.order.storeId,
    });
    if (!auth.ok) return auth.result;
    return ok({ order: orderDto(scoped.order) });
  }
  const customer = requireCustomerAuth(session, correlationId);
  if (!customer.ok) return customer.result;
  const order = await ctx.repos.orders.findById(orderId);
  if (!order) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  if (
    customer.actor.storeId &&
    order.storeId !== customer.actor.storeId
  ) {
    return fail({ code: "FORBIDDEN", correlationId, status: 403 });
  }
  return ok({ order: orderDto(order) });
}

async function merchantOrderAction(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  orderId: string,
  action: (
    orderId: string,
  ) => Promise<{
    order: Parameters<typeof orderDto>[0];
    event?: Parameters<typeof enqueueDomainEvent>[0]["domainEvent"];
  }>,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const pre = requireMerchantAuth(session, correlationId);
  if (!pre.ok) return pre.result;
  const scoped = await assertOrderTenant(
    ctx,
    orderId,
    pre.actor.merchantId,
    correlationId,
  );
  if (!scoped.ok) return scoped.result;
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "pickup.manage",
    resourceStoreId: scoped.order.storeId,
  });
  if (!auth.ok) return auth.result;
  const ran = await runUseCase(correlationId, () => action(orderId));
  if (!ran.ok) return ran.result;
  if (ran.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: ran.data.event,
      merchantId: scoped.order.merchantId,
      storeId: scoped.order.storeId,
    });
  }
  return ok({ order: orderDto(ran.data.order) });
}

export async function handleOrderPreparing(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  orderId: string,
): Promise<HttpHandlerResult> {
  return merchantOrderAction(request, ctx, session, orderId, (id) =>
    ctx.ordering.startPreparing({ orderId: id }),
  );
}

export async function handleOrderReady(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  orderId: string,
): Promise<HttpHandlerResult> {
  return merchantOrderAction(request, ctx, session, orderId, (id) =>
    ctx.ordering.markReadyForPickup({ orderId: id }),
  );
}

export async function handleOrderPickedUp(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  orderId: string,
): Promise<HttpHandlerResult> {
  return merchantOrderAction(request, ctx, session, orderId, (id) =>
    ctx.ordering.markPickedUp({ orderId: id }),
  );
}

export async function handleOrderComplete(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  orderId: string,
): Promise<HttpHandlerResult> {
  return merchantOrderAction(request, ctx, session, orderId, (id) =>
    ctx.ordering.completeOrder({ orderId: id }),
  );
}

export async function handleOrderCancel(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  orderId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const pre = requireMerchantAuth(session, correlationId);
  if (!pre.ok) return pre.result;
  const scoped = await assertOrderTenant(
    ctx,
    orderId,
    pre.actor.merchantId,
    correlationId,
  );
  if (!scoped.ok) return scoped.result;
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "pickup.manage",
    resourceStoreId: scoped.order.storeId,
  });
  if (!auth.ok) return auth.result;
  const parsed = await parseBody(request, cancelSchema, correlationId);
  const reason = parsed.ok ? parsed.data.reason : undefined;
  const ran = await runUseCase(correlationId, () =>
    ctx.ordering.cancelOrder({
      orderId,
      ...(reason !== undefined ? { reason } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ order: orderDto(ran.data.order) });
}

export async function handleOrderRefund(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  orderId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const pre = requireMerchantAuth(session, correlationId);
  if (!pre.ok) return pre.result;
  const scoped = await assertOrderTenant(
    ctx,
    orderId,
    pre.actor.merchantId,
    correlationId,
  );
  if (!scoped.ok) return scoped.result;
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "pickup.manage",
    resourceStoreId: scoped.order.storeId,
  });
  if (!auth.ok) return auth.result;

  const linked = await refundLinkedPaymentForOrder(
    ctx,
    correlationId,
    orderId,
    pre.actor.merchantId,
  );
  if (!linked.ok) return linked.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.ordering.refundOrder({ orderId }),
  );
  if (!ran.ok) return ran.result;
  if (ran.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: ran.data.event,
      merchantId: scoped.order.merchantId,
      storeId: scoped.order.storeId,
    });
  }
  return ok({ order: orderDto(ran.data.order) });
}
