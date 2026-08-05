/**
 * ADR-094 / ADR-105 — batch offline sale sync (staff only).
 * Each item = CompleteSale with syncKey as Idempotency-Key.
 * Stock shortage → per-item rejected_for_review (never silent overwrite).
 */

import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import { requireMerchantPermissionResolved } from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const syncSaleSchema = z.object({
  storeId: z.string().min(1),
  phone: z.string().min(1),
  tenderType: z.string().min(1),
  syncKey: z.string().min(1),
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

const syncBatchSchema = z.object({
  sales: z.array(syncSaleSchema).min(1).max(50),
});

export async function handleSyncOfflineSales(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }

  const sessionStoreId = session?.storeId ?? session?.user?.storeId ?? null;
  const gate = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "pos.sale",
    ...(typeof sessionStoreId === "string"
      ? { resourceStoreId: sessionStoreId }
      : {}),
  });
  if (!gate.ok) return gate.result;

  const parsed = await parseBody(request, syncBatchSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const results: Array<{
    syncKey: string;
    status: "synced" | "rejected_for_review" | "failed";
    saleId?: string;
    created?: boolean;
    code?: string;
    messageFa?: string;
  }> = [];

  for (const sale of parsed.data.sales) {
    const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
      permission: "pos.sale",
      bodyMerchantId: sale.merchantId,
      resourceStoreId: sale.storeId,
    });
    if (!auth.ok) {
      results.push({
        syncKey: sale.syncKey,
        status: "failed",
        code: "FORBIDDEN",
        messageFa: "دسترسی به این فروشگاه مجاز نیست.",
      });
      continue;
    }

    const ran = await runUseCase(correlationId, () =>
      ctx.pos.completeSale({
        merchantId: auth.actor.merchantId,
        storeId: sale.storeId,
        phone: sale.phone,
        tenderType: sale.tenderType,
        idempotencyKey: sale.syncKey,
        lines: sale.lines.map((line) => ({
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          unitPriceMinor:
            typeof line.unitPriceMinor === "string"
              ? BigInt(line.unitPriceMinor)
              : BigInt(line.unitPriceMinor),
        })),
        ...(sale.consentNoticeVersion !== undefined
          ? { consentNoticeVersion: sale.consentNoticeVersion }
          : {}),
      }),
    );

    if (!ran.ok) {
      const errBody = ran.result.body as {
        error?: { code?: string; message?: string };
      };
      const code = errBody.error?.code ?? "SYNC_ERROR";
      const messageFa = errBody.error?.message ?? "";

      if (code === "INSUFFICIENT_STOCK") {
        results.push({
          syncKey: sale.syncKey,
          status: "rejected_for_review",
          code,
          messageFa:
            messageFa ||
            "به‌خاطر کمبود موجودی، فروش آفلاین رد شد و برای بررسی نگه داشته شد.",
        });
        continue;
      }

      results.push({
        syncKey: sale.syncKey,
        status: "failed",
        code,
        messageFa: messageFa || "همگام‌سازی صف ناموفق بود.",
      });
      continue;
    }

    results.push({
      syncKey: sale.syncKey,
      status: "synced",
      saleId: ran.data.sale.id,
      created: ran.data.created,
    });
  }

  return ok({ results });
}

/** Guard used by tests — sync must never silently overwrite stock conflicts. */
export function assertSyncRejectsStockShortage(status: string): void {
  if (status !== "rejected_for_review") {
    throw new Error(
      'Offline sync stock shortage must be "rejected_for_review" (ADR-105 / ADR-091).',
    );
  }
}
