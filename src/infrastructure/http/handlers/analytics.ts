/**
 * ADR-106 merchant OLTP analytics HTTP handlers (AN-01..04).
 * Cache-aside TTL 60s (in-memory until ADR-108 Redis).
 */

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import {
  buildDashboardCustomersKey,
  buildDashboardOverviewKey,
  buildDashboardRetentionKey,
  buildDashboardRevenueKey,
  CACHE_TTL_SECONDS,
} from "../../redis/cache-keys/index.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  methodNotAllowed,
  ok,
} from "../envelopes.js";
import { requireActiveMerchantPermission } from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";
import { stubJalaliRange } from "../../../modules/analytics/index.js";

function cacheEnv(): string {
  return process.env.MOS_ENV?.trim() || process.env.NODE_ENV || "dev";
}

function serializeBigInt(value: bigint): string {
  return value.toString();
}

function rangeFromUrl(url: URL) {
  const fromDay = url.searchParams.get("fromDay") ?? undefined;
  const toDay = url.searchParams.get("toDay") ?? undefined;
  if (fromDay && toDay) {
    return stubJalaliRange({ fromDay, toDay });
  }
  return undefined;
}

async function gateAnalytics(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<
  | {
      ok: true;
      merchantId: string;
      storeId: string | null;
      correlationId: string;
      range: ReturnType<typeof stubJalaliRange> | undefined;
    }
  | { ok: false; result: HttpHandlerResult }
> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return { ok: false, result: methodNotAllowed(correlationId, "GET") };
  }
  const auth = await requireActiveMerchantPermission(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "merchant.read" },
  );
  if (!auth.ok) return auth;

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  return {
    ok: true,
    merchantId: auth.actor.merchantId,
    storeId: storeId?.trim() || null,
    correlationId,
    range: rangeFromUrl(url),
  };
}

async function cachedLoad<T>(
  ctx: ApiContext,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  if (!ctx.analyticsCache) {
    return loader();
  }
  const result = await ctx.analyticsCache.getOrLoad({
    key,
    ttlSeconds: CACHE_TTL_SECONDS.analytics,
    loader: async () => loader(),
  });
  return result.value;
}

export async function handleAnalyticsOverview(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const gate = await gateAnalytics(request, ctx, session);
  if (!gate.ok) return gate.result;
  const key = buildDashboardOverviewKey({
    env: cacheEnv(),
    merchantId: gate.merchantId,
  });
  const ran = await runUseCase(gate.correlationId, () =>
    cachedLoad(ctx, key, async () => {
      const d = await ctx.analytics.getOverview({
        merchantId: gate.merchantId,
        storeId: gate.storeId,
        ...(gate.range ? { range: gate.range } : {}),
      });
      return {
        ...d,
        revenueMinor: serializeBigInt(d.revenueMinor),
      };
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ overview: ran.data });
}

export async function handleAnalyticsRevenue(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const gate = await gateAnalytics(request, ctx, session);
  if (!gate.ok) return gate.result;
  const rangeKey = gate.range
    ? `${gate.range.fromDay}_${gate.range.toDay}`
    : "default";
  const key = buildDashboardRevenueKey({
    env: cacheEnv(),
    merchantId: gate.merchantId,
    range: rangeKey,
  });
  const ran = await runUseCase(gate.correlationId, () =>
    cachedLoad(ctx, key, async () => {
      const d = await ctx.analytics.getRevenue({
        merchantId: gate.merchantId,
        storeId: gate.storeId,
        ...(gate.range ? { range: gate.range } : {}),
      });
      return {
        ...d,
        revenueMinor: serializeBigInt(d.revenueMinor),
        days: d.days.map((day) => ({
          ...day,
          revenueMinor: serializeBigInt(day.revenueMinor),
        })),
      };
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ revenue: ran.data });
}

export async function handleAnalyticsCustomers(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const gate = await gateAnalytics(request, ctx, session);
  if (!gate.ok) return gate.result;
  const rangeKey = gate.range
    ? `${gate.range.fromDay}_${gate.range.toDay}`
    : "default";
  const key = buildDashboardCustomersKey({
    env: cacheEnv(),
    merchantId: gate.merchantId,
    range: rangeKey,
  });
  const ran = await runUseCase(gate.correlationId, () =>
    cachedLoad(ctx, key, () =>
      ctx.analytics.getCustomers({
        merchantId: gate.merchantId,
        storeId: gate.storeId,
        ...(gate.range ? { range: gate.range } : {}),
      }),
    ),
  );
  if (!ran.ok) return ran.result;
  return ok({ customers: ran.data });
}

export async function handleAnalyticsRetention(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const gate = await gateAnalytics(request, ctx, session);
  if (!gate.ok) return gate.result;
  const key = buildDashboardRetentionKey({
    env: cacheEnv(),
    merchantId: gate.merchantId,
  });
  const ran = await runUseCase(gate.correlationId, () =>
    cachedLoad(ctx, key, () =>
      ctx.analytics.getRetention({
        merchantId: gate.merchantId,
        storeId: gate.storeId,
        ...(gate.range ? { range: gate.range } : {}),
      }),
    ),
  );
  if (!ran.ok) return ran.result;
  return ok({ retention: ran.data });
}
