/**
 * ADR-094 / ADR-113 POS sales handlers — Idempotency-Key required.
 */

import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { saleDto } from "../dtos.js";
import { runUseCase } from "../domain-error.js";
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
  requireMerchantPermission,
  requireActiveMerchantPermission,
} from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const completeSaleSchema = z.object({
  storeId: z.string().min(1),
  phone: z.string().min(1),
  tenderType: z.string().min(1),
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
  consentNoticeVersion: z.string().optional(),
  merchantId: z.string().optional(),
});

export async function handleCompleteSale(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  const sessionStoreId = session?.storeId ?? session?.user?.storeId ?? null;
  const gate = await requireActiveMerchantPermission(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "pos.sale",
      ...(typeof sessionStoreId === "string"
        ? { resourceStoreId: sessionStoreId }
        : {}),
    },
  );
  if (!gate.ok) return gate.result;

  const idem = requireIdempotencyHeader(request, correlationId);
  if (!idem.ok) return idem.result;

  const parsed = await parseBody(request, completeSaleSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireActiveMerchantPermission(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "pos.sale",
      bodyMerchantId: parsed.data.merchantId,
      resourceStoreId: parsed.data.storeId,
    },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.pos.completeSale({
      merchantId: auth.actor.merchantId,
      storeId: parsed.data.storeId,
      phone: parsed.data.phone,
      tenderType: parsed.data.tenderType,
      idempotencyKey: idem.key,
      lines: parsed.data.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceMinor:
          typeof line.unitPriceMinor === "string"
            ? BigInt(line.unitPriceMinor)
            : BigInt(line.unitPriceMinor),
      })),
      ...(parsed.data.consentNoticeVersion !== undefined
        ? { consentNoticeVersion: parsed.data.consentNoticeVersion }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;

  // ADR-106 — best-effort projection apply; never fail the sale response.
  if (ran.data.created && ctx.analyticsProjection && ran.data.sale) {
    const sale = ran.data.sale;
    void ctx.analyticsProjection
      .applySaleCompleted({
        eventId: `sale.completed:${sale.id}`,
        merchantId: sale.merchantId,
        storeId: sale.storeId,
        membershipId: sale.membershipId,
        occurredAt: sale.completedAt ?? sale.createdAt,
        revenueMinor: sale.totalAmountMinor,
        hasPhone: Boolean(sale.phoneNational),
      })
      .catch(() => undefined);
  }

  return ok(
    {
      sale: saleDto(ran.data.sale),
      created: ran.data.created,
      membershipCreated: ran.data.membershipCreated,
    },
    { status: ran.data.created ? 201 : 200 },
  );
}

export async function handleGetSale(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  saleId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const pre = await requireMerchantAuthResolved(session, correlationId, ctx.repos.merchants);
  if (!pre.ok) return pre.result;
  const sale = await ctx.repos.sales.findById(saleId);
  if (!sale || sale.merchantId !== pre.actor.merchantId) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  const auth = requireMerchantPermission(session, correlationId, {
    permission: "pos.sale",
    resourceStoreId: sale.storeId,
  });
  if (!auth.ok) return auth.result;
  return ok({ sale: saleDto(sale) });
}

/**
 * GET /api/v1/sales/{id}/receipt — authZ then short-TTL signed download URL (ADR-111).
 */
export async function handleGetSaleReceipt(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  saleId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const pre = await requireMerchantAuthResolved(session, correlationId, ctx.repos.merchants);
  if (!pre.ok) return pre.result;

  const sale = await ctx.repos.sales.findById(saleId);
  if (!sale || sale.merchantId !== pre.actor.merchantId) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  const auth = requireMerchantPermission(session, correlationId, {
    permission: "pos.sale",
    resourceStoreId: sale.storeId,
  });
  if (!auth.ok) return auth.result;

  if (!sale.receiptObjectKey || !ctx.objectStorage) {
    return fail({
      code: "CONFLICT",
      correlationId,
      status: 409,
      messageFa: "رسید هنوز آماده نشده است. کمی بعد دوباره تلاش کنید.",
    });
  }

  const {
    createValidatedPresignedDownload,
    MINIO_BUCKETS,
    PRESIGN_TTL_SECONDS,
  } = await import("../../minio/contracts/index.js");
  const signed = await createValidatedPresignedDownload(ctx.objectStorage, {
    bucket: MINIO_BUCKETS.receipts,
    objectKey: sale.receiptObjectKey,
    expiresInSeconds: PRESIGN_TTL_SECONDS.download,
  });

  return ok({
    saleId: sale.id,
    receiptRef: sale.id,
    objectKey: sale.receiptObjectKey,
    contentType: sale.receiptContentType ?? "text/html",
    downloadUrl: signed.url,
    expiresAt: signed.expiresAt.toISOString(),
    refreshPath: `/api/v1/sales/${sale.id}/receipt`,
  });
}
