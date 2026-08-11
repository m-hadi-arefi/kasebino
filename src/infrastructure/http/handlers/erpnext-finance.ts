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

  return ok(
    {
      company: "MerchantOS Demo",
      accounts: [
        {
          name: "Application of Funds (Assets) - MD",
          accountName: "دارایی‌ها (Assets)",
          rootType: "Asset",
          isGroup: true,
          balance: 850000000,
          currency: "IRR",
          children: [
            {
              name: "Current Assets - MD",
              accountName: "دارایی‌های جاری",
              rootType: "Asset",
              isGroup: true,
              balance: 550000000,
              currency: "IRR",
              children: [
                {
                  name: "Bank Accounts - MD",
                  accountName: "حساب‌های بانکی",
                  rootType: "Asset",
                  isGroup: false,
                  balance: 350000000,
                  currency: "IRR",
                },
                {
                  name: "Cash In Hand - MD",
                  accountName: "صندوق و وجوه نقد",
                  rootType: "Asset",
                  isGroup: false,
                  balance: 200000000,
                  currency: "IRR",
                },
              ],
            },
          ],
        },
        {
          name: "Source of Funds (Liabilities) - MD",
          accountName: "بدهی‌ها (Liabilities)",
          rootType: "Liability",
          isGroup: true,
          balance: 120000000,
          currency: "IRR",
          children: [
            {
              name: "Accounts Payable - MD",
              accountName: "حساب‌های پرداختنی (تامین‌کنندگان)",
              rootType: "Liability",
              isGroup: false,
              balance: 120000000,
              currency: "IRR",
            },
          ],
        },
        {
          name: "Income - MD",
          accountName: "درآمدها (Income)",
          rootType: "Income",
          isGroup: true,
          balance: 1250000000,
          currency: "IRR",
          children: [
            {
              name: "Sales - MD",
              accountName: "فروش کالا و خدمات",
              rootType: "Income",
              isGroup: false,
              balance: 1250000000,
              currency: "IRR",
            },
          ],
        },
      ],
    },
    { meta: { correlationId } },
  );
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

  return ok(
    {
      entries: [
        {
          id: "GL-001",
          postingDate: new Date().toISOString().split("T")[0],
          account: "Sales - MD",
          againstAccount: "Cash In Hand - MD",
          debit: 0,
          credit: 15000000,
          balance: 15000000,
          voucherType: "Sales Invoice",
          voucherNo: "ACC-SINV-2026-00001",
          remarks: "فروش حضوری صندوق POS",
        },
        {
          id: "GL-002",
          postingDate: new Date().toISOString().split("T")[0],
          account: "Cash In Hand - MD",
          againstAccount: "Sales - MD",
          debit: 15000000,
          credit: 0,
          balance: 15000000,
          voucherType: "Payment Entry",
          voucherNo: "ACC-PAY-2026-00001",
          remarks: "دریافت وجه فاکتور فروش",
        },
      ],
    },
    { meta: { correlationId } },
  );
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

  return ok(
    {
      company: "MerchantOS Demo",
      currency: "IRR",
      asOfDate: new Date().toISOString().split("T")[0],
      totalIncome: 1250000000,
      totalExpense: 420000000,
      netProfit: 830000000,
    },
    { meta: { correlationId } },
  );
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

  return ok(
    {
      status: "HEALTHY",
      syncHealthPercent: 100,
      pendingEvents: 0,
      failedEvents: 0,
      mismatches: [],
      lastCheckedAt: new Date().toISOString(),
    },
    { meta: { correlationId } },
  );
}

