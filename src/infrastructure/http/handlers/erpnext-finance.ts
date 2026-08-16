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

export async function handleChartOfAccounts(
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

  const data = await ctx.erpnext.getChartOfAccounts({
    merchantId: authed.actor.merchantId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleGeneralLedger(
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
  const filters: {
    account?: string;
    fromDate?: string;
    toDate?: string;
    party?: string;
    voucherNo?: string;
    limit?: number;
  } = {};

  const account = url.searchParams.get("account");
  if (account) filters.account = account;
  const fromDate = url.searchParams.get("fromDate");
  if (fromDate) filters.fromDate = fromDate;
  const toDate = url.searchParams.get("toDate");
  if (toDate) filters.toDate = toDate;
  const party = url.searchParams.get("party");
  if (party) filters.party = party;
  const voucherNo = url.searchParams.get("voucherNo");
  if (voucherNo) filters.voucherNo = voucherNo;
  const limit = url.searchParams.get("limit");
  if (limit) filters.limit = Number(limit);

  const data = await ctx.erpnext.getGeneralLedger({
    merchantId: authed.actor.merchantId,
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleProfitAndLoss(
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

  const data = await ctx.erpnext.getProfitAndLoss({
    merchantId: authed.actor.merchantId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleBalanceSheet(
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

  const data = await ctx.erpnext.getBalanceSheet({
    merchantId: authed.actor.merchantId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleTrialBalance(
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

  const data = await ctx.erpnext.getTrialBalance({
    merchantId: authed.actor.merchantId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handlePayables(
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

  const data = await ctx.erpnext.getPayables({
    merchantId: authed.actor.merchantId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleReceivables(
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

  const data = await ctx.erpnext.getReceivables({
    merchantId: authed.actor.merchantId,
  });
  return ok(data, { meta: { correlationId } });
}

export async function handleIntegrityCheck(
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

  const syncList = await ctx.erpnext.listSyncRecords({
    merchantId: authed.actor.merchantId,
    limit: 500,
  });
  const pending = syncList.records.filter((r) => r.status === "pending").length;
  const failed = syncList.records.filter((r) => r.status === "failed").length;
  const synced = syncList.records.filter((r) => r.status === "synced").length;
  const total = syncList.records.length;
  const healthPercent = total > 0 ? Math.round((synced / total) * 100) : 100;

  return ok(
    {
      status: failed > 0 ? "DEGRADED" : "HEALTHY",
      syncHealthPercent: healthPercent,
      pendingEvents: pending,
      failedEvents: failed,
      mismatches: syncList.records
        .filter((r) => r.status === "failed")
        .map((r) => ({
          entityType: r.entityType,
          entityId: r.entityId,
          reason: r.errorMessageFa ?? "خطای همگام‌سازی",
        })),
      lastCheckedAt: new Date().toISOString(),
    },
    { meta: { correlationId } },
  );
}

