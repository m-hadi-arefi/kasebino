/**
 * HTTP handlers — ERPNext finance ACL (ADR-141). Server-only.
 */

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import type { ErpNextSyncStatus } from "../../../modules/erpnext/domain/sync-record.js";
import { correlationIdFrom, fail, ok } from "../envelopes.js";
import { requireMerchantPermissionResolved } from "../require-auth.js";
import type { HttpHandlerResult } from "../types.js";

function parseStatus(raw: string | null): ErpNextSyncStatus | undefined {
  if (raw === "pending" || raw === "synced" || raw === "failed") return raw;
  return undefined;
}

export async function handleFinanceDashboard(
  request: Request,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  const authed = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "finance.view" },
  );
  if (!authed.ok) return authed.result;

  const data = await ctx.erpnext.getFinanceDashboard({
    merchantId: authed.actor.merchantId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleFinanceInvoices(
  request: Request,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  const authed = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "finance.view" },
  );
  if (!authed.ok) return authed.result;

  const data = await ctx.erpnext.listFinanceInvoices({
    merchantId: authed.actor.merchantId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleFinanceSyncList(
  request: Request,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  const authed = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "finance.view" },
  );
  if (!authed.ok) return authed.result;

  const url = new URL(request.url);
  const status = parseStatus(url.searchParams.get("status"));
  const result = await ctx.erpnext.listSyncRecords({
    merchantId: authed.actor.merchantId,
    ...(status !== undefined ? { status } : {}),
  });
  return ok(
    {
      records: result.records.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
      })),
    },
    { meta: { correlationId } },
  );
}

export async function handleSaleFinancialStatus(
  request: Request,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  saleId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  const authed = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "finance.view" },
  );
  if (!authed.ok) return authed.result;

  if (!saleId.trim()) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "شناسه فروش نامعتبر است",
    });
  }

  const data = await ctx.erpnext.getSaleFinancialStatus({
    merchantId: authed.actor.merchantId,
    saleId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleCustomerFinancialOverview(
  request: Request,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  const authed = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "finance.view" },
  );
  if (!authed.ok) return authed.result;

  if (!customerId.trim()) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "شناسه مشتری نامعتبر است",
    });
  }

  const data = await ctx.erpnext.getCustomerFinancialOverview({
    merchantId: authed.actor.merchantId,
    customerId,
  });
  return ok(data, { meta: { correlationId } });
}
