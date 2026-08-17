/**
 * ADR-094 / ADR-099 / ADR-113 loyalty handlers.
 */

import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { normalizeIranianMobile } from "../../../shared/validation/forms/phone.js";
import { pointRuleDto, walletDto } from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import { enqueueDomainEvent } from "../enqueue-domain-event.js";
import {
  requireCustomerAuth,
  requireMerchantAuthResolved,
  requireMerchantPermissionResolved,
} from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const configureRuleSchema = z.object({
  storeId: z.string().min(1),
  amountMinorPerPoint: z.union([z.number().int().positive(), z.string()]).optional(),
  pointsPerUnit: z.number().int().positive().optional(),
  expiryMonthsAfterLastEarn: z.number().int().positive().nullable().optional(),
  merchantId: z.string().optional(),
});

const redeemSchema = z.object({
  storeId: z.string().min(1),
  membershipId: z.string().min(1),
  points: z.number().int().positive(),
  referenceId: z.string().optional(),
  merchantId: z.string().optional(),
});

export async function handleGetLoyaltyRule(
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
    permission: "loyalty.read",
    resourceStoreId: storeId,
  });
  if (!auth.ok) return auth.result;
  const rule = await ctx.repos.pointRules.findByStoreId(
    auth.actor.merchantId,
    storeId,
  );
  return ok({ rule: rule ? pointRuleDto(rule) : null });
}

export async function handleConfigureLoyaltyRule(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "PUT" && request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "PUT");
  }
  const pre = await requireMerchantAuthResolved(session, correlationId, ctx.repos.merchants);
  if (!pre.ok) return pre.result;
  const parsed = await parseBody(request, configureRuleSchema, correlationId);
  if (!parsed.ok) return parsed.result;
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "loyalty.write",
    bodyMerchantId: parsed.data.merchantId,
    resourceStoreId: parsed.data.storeId,
  });
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.loyalty.configurePointRule({
      merchantId: auth.actor.merchantId,
      storeId: parsed.data.storeId,
      ...(parsed.data.amountMinorPerPoint !== undefined
        ? {
            amountMinorPerPoint:
              typeof parsed.data.amountMinorPerPoint === "string"
                ? BigInt(parsed.data.amountMinorPerPoint)
                : BigInt(parsed.data.amountMinorPerPoint),
          }
        : {}),
      ...(parsed.data.pointsPerUnit !== undefined
        ? { pointsPerUnit: parsed.data.pointsPerUnit }
        : {}),
      ...(parsed.data.expiryMonthsAfterLastEarn !== undefined
        ? { expiryMonthsAfterLastEarn: parsed.data.expiryMonthsAfterLastEarn }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    rule: pointRuleDto(ran.data.rule),
    created: ran.data.created,
  });
}

export async function handleGetWallet(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  membershipId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const pre = await requireMerchantAuthResolved(session, correlationId, ctx.repos.merchants);
  if (!pre.ok) return pre.result;
  const membership = await ctx.repos.storeMemberships.findById(membershipId);
  const storeId = membership?.storeId;
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "loyalty.read",
    ...(storeId ? { resourceStoreId: storeId } : {}),
  });
  if (!auth.ok) return auth.result;
  const ran = await runUseCase(correlationId, () =>
    ctx.loyalty.getWallet({
      membershipId,
      merchantId: auth.actor.merchantId,
    }),
  );
  if (!ran.ok) return ran.result;
  if (!ran.data) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  return ok({ wallet: walletDto(ran.data) });
}

/** Merchant POS: resolve wallet by store + Iranian mobile. */
export async function handleGetWalletByPhone(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId")?.trim() ?? "";
  const phoneRaw = url.searchParams.get("phone")?.trim() ?? "";
  if (!storeId || !phoneRaw) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "فروشگاه و شماره موبایل الزامی است.",
    });
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "loyalty.read",
    resourceStoreId: storeId,
  });
  if (!auth.ok) return auth.result;

  const phoneNational = normalizeIranianMobile(phoneRaw);
  if (!phoneNational) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "شماره موبایل معتبر نیست.",
    });
  }

  const membership = await ctx.repos.storeMemberships.findByStoreAndPhone(
    storeId,
    phoneNational,
  );
  if (!membership || membership.merchantId !== auth.actor.merchantId) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "عضویت برای این شماره در فروشگاه یافت نشد.",
    });
  }

  const ran = await runUseCase(correlationId, () =>
    ctx.loyalty.getWallet({
      membershipId: membership.id,
      merchantId: auth.actor.merchantId,
      storeId,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    membershipId: membership.id,
    phoneNational: membership.phoneNational,
    wallet: ran.data ? walletDto(ran.data) : null,
  });
}

export async function handleRedeemPoints(
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
  const parsed = await parseBody(request, redeemSchema, correlationId);
  if (!parsed.ok) return parsed.result;
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "loyalty.write",
    bodyMerchantId: parsed.data.merchantId,
    resourceStoreId: parsed.data.storeId,
  });
  if (!auth.ok) return auth.result;
  const ran = await runUseCase(correlationId, () =>
    ctx.loyalty.redeemPoints({
      merchantId: auth.actor.merchantId,
      storeId: parsed.data.storeId,
      membershipId: parsed.data.membershipId,
      points: parsed.data.points,
      ...(parsed.data.referenceId !== undefined
        ? { referenceId: parsed.data.referenceId }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;

  if (ran.data.event) {
    await enqueueDomainEvent({
      ...(ctx.outbox ? { outbox: ctx.outbox } : {}),
      ...(ctx.cache ? { cache: ctx.cache } : {}),
      notifications: ctx.notifications,
      domainEvent: ran.data.event,
      merchantId: ran.data.wallet.merchantId,
      storeId: ran.data.wallet.storeId,
    });
  }

  return ok({
    wallet: walletDto(ran.data.wallet),
    points: ran.data.points,
    created: ran.data.created,
  });
}

/**
 * Customer portal — wallet for authenticated customer at storefront slug.
 * Resolves membership via identity phone + store (ADR-099 / store-first).
 */
export async function handleCustomerStorefrontWallet(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const customer = requireCustomerAuth(session, correlationId);
  if (!customer.ok) return customer.result;

  const identities = ctx.repos.customerIdentities;
  if (!identities) {
    return fail({
      code: "SERVICE_UNAVAILABLE",
      correlationId,
      status: 503,
      messageFa: "سرویس هویت مشتری در دسترس نیست.",
    });
  }

  const store = await ctx.repos.stores.findBySlug(slug);
  if (!store || store.status !== "active") {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  if (customer.actor.storeId && customer.actor.storeId !== store.id) {
    return fail({
      code: "FORBIDDEN",
      correlationId,
      status: 403,
      messageFa: "این کیف امتیاز متعلق به فروشگاه دیگری است.",
    });
  }

  const identity = await identities.findById(customer.actor.userId);
  if (!identity) {
    return fail({
      code: "NOT_FOUND",
      correlationId,
      status: 404,
      messageFa: "هویت مشتری یافت نشد.",
    });
  }

  const membership = await ctx.repos.storeMemberships.findByStoreAndPhone(
    store.id,
    identity.phoneNational,
  );
  if (!membership) {
    return ok({
      storeId: store.id,
      membershipId: null,
      wallet: null,
      ledger: [] as Array<{
        id: string;
        entryType: string;
        points: number;
        createdAt: string;
      }>,
    });
  }

  const wallet = await ctx.loyalty.getWallet({
    membershipId: membership.id,
    storeId: store.id,
  });
  const ledger = wallet
    ? await ctx.repos.pointsLedger.listByWalletId(wallet.id, { limit: 20 })
    : [];

  return ok({
    storeId: store.id,
    membershipId: membership.id,
    wallet: wallet ? walletDto(wallet) : null,
    ledger: ledger
      .slice()
      .reverse()
      .map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        points: entry.points,
        createdAt: entry.createdAt.toISOString(),
      })),
  });
}
