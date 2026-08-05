/**
 * ADR-094 / ADR-102 payments handlers —
 * Intent create, sandbox confirm (env-gated), webhook verify, refund.
 * On verified success → ordering.markPaid (never trust client “I paid”).
 */

import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import {
  isSandboxPaymentConfirmAllowed,
  PaymentsDomainError,
} from "../../../modules/payments/application/index.js";
import type { PaymentIntent } from "../../../modules/payments/domain/payment-intent.js";
import { paymentDto, orderDto } from "../dtos.js";
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
  requireMerchantAuthResolved,
  requireMerchantPermissionResolved,
} from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const createIntentSchema = z.object({
  storeId: z.string().min(1),
  orderId: z.string().min(1),
  amountMinor: z.union([z.number().int().positive(), z.string()]),
  callbackUrl: z.string().url().optional(),
  merchantId: z.string().optional(),
});

const sandboxConfirmSchema = z.object({
  outcome: z.enum(["succeeded", "failed"]).optional(),
});

async function markOrderPaidFromVerifiedPayment(
  ctx: ApiContext,
  correlationId: string,
  payment: PaymentIntent,
): Promise<
  | { ok: true; order: ReturnType<typeof orderDto> | null }
  | { ok: false; result: HttpHandlerResult }
> {
  const order = await ctx.repos.orders.findById(payment.orderId);
  if (!order) {
    return {
      ok: false,
      result: fail({
        code: "ORDER_NOT_FOUND",
        correlationId,
        status: 404,
        messageFa: "سفارش مرتبط با این پرداخت پیدا نشد.",
      }),
    };
  }
  if (order.status !== "pending_payment") {
    return { ok: true, order: orderDto(order) };
  }

  const paid = await runUseCase(correlationId, () =>
    ctx.ordering.markPaid({
      orderId: payment.orderId,
      ...(payment.providerRef
        ? { paymentReference: payment.providerRef }
        : {}),
    }),
  );
  if (!paid.ok) return paid;

  if (paid.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: paid.data.event,
      merchantId: payment.merchantId,
      storeId: payment.storeId,
    });
  }

  return { ok: true, order: orderDto(paid.data.order) };
}

export async function handleCreatePaymentIntent(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const pre = await requireMerchantAuthResolved(session, correlationId, ctx.repos.merchants);
  if (!pre.ok) return pre.result;

  const idem = requireIdempotencyHeader(request, correlationId);
  if (!idem.ok) return idem.result;

  const parsed = await parseBody(request, createIntentSchema, correlationId);
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

  const amountMinor =
    typeof parsed.data.amountMinor === "string"
      ? BigInt(parsed.data.amountMinor)
      : BigInt(parsed.data.amountMinor);

  const ran = await runUseCase(correlationId, () =>
    ctx.payments.createIntent({
      merchantId: auth.actor.merchantId,
      storeId: parsed.data.storeId,
      orderId: parsed.data.orderId,
      amountMinor,
      idempotencyKey: idem.key,
      ...(parsed.data.callbackUrl !== undefined
        ? { callbackUrl: parsed.data.callbackUrl }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;

  if (ran.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: ran.data.event,
      merchantId: auth.actor.merchantId,
      storeId: parsed.data.storeId,
    });
  }

  return ok(
    {
      payment: paymentDto(ran.data.payment),
      created: ran.data.created,
      redirectUrl: ran.data.redirectUrl,
    },
    { status: ran.data.created ? 201 : 200 },
  );
}

export async function handleGetPayment(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  paymentId: string,
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
    permission: "merchant.write",
  });
  if (!auth.ok) return auth.result;
  const payment = await ctx.repos.payments.findById(paymentId);
  if (!payment || payment.merchantId !== auth.actor.merchantId) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  return ok({ payment: paymentDto(payment) });
}

/**
 * Dev/local sandbox confirm — env-gated (ADR-102).
 * POST /api/v1/payments/{id}/sandbox/confirm
 */
export async function handleSandboxConfirmPayment(
  request: HttpRequestLike,
  ctx: ApiContext,
  paymentId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  if (!isSandboxPaymentConfirmAllowed(env)) {
    return fail({
      code: "SANDBOX_CONFIRM_FORBIDDEN",
      correlationId,
      status: 403,
      messageFa: new PaymentsDomainError("SANDBOX_CONFIRM_FORBIDDEN").messageFa,
    });
  }

  let outcome: "succeeded" | "failed" | undefined;
  try {
    const raw = await request.json();
    const parsed = sandboxConfirmSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return fail({
        code: "VALIDATION_ERROR",
        correlationId,
        status: 400,
        messageFa: "بدن درخواست نامعتبر است.",
      });
    }
    outcome = parsed.data.outcome;
  } catch {
    outcome = undefined;
  }

  const ran = await runUseCase(correlationId, () =>
    ctx.payments.confirmSandboxPayment({
      paymentId,
      ...(outcome !== undefined ? { outcome } : {}),
    }),
  );
  if (!ran.ok) return ran.result;

  if (ran.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: ran.data.event,
      merchantId: ran.data.payment.merchantId,
      storeId: ran.data.payment.storeId,
    });
  }

  let orderDtoResult: ReturnType<typeof orderDto> | null = null;
  if (ran.data.confirmed) {
    const paid = await markOrderPaidFromVerifiedPayment(
      ctx,
      correlationId,
      ran.data.payment,
    );
    if (!paid.ok) return paid.result;
    orderDtoResult = paid.order;
  }

  return ok({
    payment: paymentDto(ran.data.payment),
    confirmed: ran.data.confirmed,
    order: orderDtoResult,
  });
}

const webhookBodySchema = z.object({
  paymentId: z.string().min(1),
  providerRef: z.string().min(1),
  outcome: z.enum(["succeeded", "failed"]),
  failureCode: z.string().optional(),
});

export async function handlePaymentWebhook(
  request: HttpRequestLike,
  ctx: ApiContext,
  provider: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "بدن درخواست نامعتبر است.",
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody) as unknown;
  } catch {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "بدن درخواست باید JSON معتبر باشد.",
    });
  }

  const parsed = webhookBodySchema.safeParse(json);
  if (!parsed.success) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      details: {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
  }

  const signatureHeader =
    request.headers.get("x-signature") ??
    request.headers.get("X-Signature") ??
    null;

  const ran = await runUseCase(correlationId, () =>
    ctx.payments.handleWebhook({
      provider,
      rawBody,
      signatureHeader,
      paymentId: parsed.data.paymentId,
      providerRef: parsed.data.providerRef,
      outcome: parsed.data.outcome,
      ...(parsed.data.failureCode !== undefined
        ? { failureCode: parsed.data.failureCode }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;

  if (ran.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: ran.data.event,
      merchantId: ran.data.payment.merchantId,
      storeId: ran.data.payment.storeId,
    });
  }

  let orderDtoResult: ReturnType<typeof orderDto> | null = null;
  if (ran.data.confirmed) {
    const paid = await markOrderPaidFromVerifiedPayment(
      ctx,
      correlationId,
      ran.data.payment,
    );
    if (!paid.ok) return paid.result;
    orderDtoResult = paid.order;
  }

  return ok({
    payment: paymentDto(ran.data.payment),
    confirmed: ran.data.confirmed,
    alreadyProcessed: ran.data.alreadyProcessed ?? false,
    order: orderDtoResult,
  });
}

/**
 * Merchant refund payment (full refund MVP) + order refund coordination.
 * POST /api/v1/payments/{id}/refunds
 */
export async function handleRefundPayment(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  paymentId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  const pre = await requireMerchantAuthResolved(session, correlationId, ctx.repos.merchants);
  if (!pre.ok) return pre.result;

  const payment = await ctx.repos.payments.findById(paymentId);
  if (!payment || payment.merchantId !== pre.actor.merchantId) {
    return fail({
      code: "PAYMENT_NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "پرداخت پیدا نشد.",
    });
  }

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "pickup.manage",
    resourceStoreId: payment.storeId,
  });
  if (!auth.ok) return auth.result;

  const refunded =
    payment.status === "refunded"
      ? {
          ok: true as const,
          data: {
            payment,
            event: null,
          },
        }
      : await runUseCase(correlationId, () =>
          ctx.payments.refundPayment({ paymentId }),
        );
  if (!refunded.ok) return refunded.result;

  if (refunded.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: refunded.data.event,
      merchantId: payment.merchantId,
      storeId: payment.storeId,
    });
  }

  const order = await ctx.repos.orders.findById(payment.orderId);
  let orderResult: ReturnType<typeof orderDto> | null = null;
  if (order && order.status !== "refunded") {
    const orderRefund = await runUseCase(correlationId, () =>
      ctx.ordering.refundOrder({ orderId: payment.orderId }),
    );
    if (!orderRefund.ok) return orderRefund.result;
    if (orderRefund.data.event) {
      await enqueueDomainEvent({
        outbox: ctx.outbox,
        cache: ctx.cache,
        notifications: ctx.notifications,
        domainEvent: orderRefund.data.event,
        merchantId: payment.merchantId,
        storeId: payment.storeId,
      });
    }
    orderResult = orderDto(orderRefund.data.order);
  } else if (order) {
    orderResult = orderDto(order);
  }

  return ok({
    payment: paymentDto(refunded.data.payment),
    order: orderResult,
  });
}

/**
 * Shared helper for merchant order refund → also refund linked payment.
 */
export async function refundLinkedPaymentForOrder(
  ctx: ApiContext,
  correlationId: string,
  orderId: string,
  merchantId: string,
): Promise<{ ok: true } | { ok: false; result: HttpHandlerResult }> {
  const payment = await ctx.repos.payments.findByOrderId(merchantId, orderId);
  if (!payment) return { ok: true };
  if (payment.status === "refunded") return { ok: true };
  if (payment.status !== "succeeded") return { ok: true };

  const ran = await runUseCase(correlationId, () =>
    ctx.payments.refundPayment({ paymentId: payment.id }),
  );
  if (!ran.ok) return ran;

  if (ran.data.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: ran.data.event,
      merchantId: payment.merchantId,
      storeId: payment.storeId,
    });
  }
  return { ok: true };
}
