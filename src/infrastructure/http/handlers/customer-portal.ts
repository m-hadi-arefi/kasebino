/**
 * ADR-103 — Customer membership portal reads under /api/v1/storefront/{slug}/me/*.
 * Store-scoped authZ; no cross-store leak.
 */

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import {
  membershipDto,
  membershipEngagementDto,
  orderDto,
  saleDto,
} from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
} from "../envelopes.js";
import { requireCustomerAuth } from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";
import { handleCustomerStorefrontWallet } from "./loyalty.js";

function maskIranianPhone(phoneNational: string): string {
  const digits = phoneNational.replace(/\D/g, "");
  if (digits.length < 7) return "۰۹********";
  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

async function resolvePortalMembership(
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
  correlationId: string,
) {
  const customer = requireCustomerAuth(session, correlationId);
  if (!customer.ok) return customer;

  const identities = ctx.repos.customerIdentities;
  if (!identities) {
    return {
      ok: false as const,
      result: fail({
        code: "SERVICE_UNAVAILABLE",
        correlationId,
        status: 503,
        messageFa: "سرویس هویت مشتری در دسترس نیست.",
      }),
    };
  }

  const store = await ctx.repos.stores.findBySlug(slug);
  if (!store || store.status !== "active") {
    return {
      ok: false as const,
      result: fail({
        code: "NOT_FOUND",
        correlationId,
        status: 404,
        messageFa: "فروشگاه پیدا نشد یا غیرفعال است.",
      }),
    };
  }

  if (customer.actor.storeId && customer.actor.storeId !== store.id) {
    return {
      ok: false as const,
      result: fail({
        code: "FORBIDDEN",
        correlationId,
        status: 403,
        messageFa: "این نشست متعلق به فروشگاه دیگری است.",
      }),
    };
  }

  const identity = await identities.findById(customer.actor.userId);
  if (!identity) {
    return {
      ok: false as const,
      result: fail({
        code: "NOT_FOUND",
        correlationId,
        status: 404,
        messageFa: "هویت مشتری یافت نشد.",
      }),
    };
  }

  const membership = await ctx.repos.storeMemberships.findByStoreAndPhone(
    store.id,
    identity.phoneNational,
  );

  return {
    ok: true as const,
    actor: customer.actor,
    store,
    identity,
    membership,
  };
}

/** GET /api/v1/storefront/{slug}/me — profile + engagement for this membership. */
export async function handleCustomerStorefrontMe(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }

  const resolved = await resolvePortalMembership(
    ctx,
    session,
    slug,
    correlationId,
  );
  if (!resolved.ok) return resolved.result;

  if (!resolved.membership) {
    return ok({
      storeId: resolved.store.id,
      storeSlug: resolved.store.slug,
      storeDisplayName: resolved.store.branding.displayName,
      membership: null,
      phoneMasked: maskIranianPhone(resolved.identity.phoneNational),
      engagement: null,
    });
  }

  const profile = await runUseCase(correlationId, () =>
    ctx.crm.getMembershipProfile({ membershipId: resolved.membership!.id }),
  );
  if (!profile.ok) return profile.result;

  return ok({
    storeId: resolved.store.id,
    storeSlug: resolved.store.slug,
    storeDisplayName: resolved.store.branding.displayName,
    membership: membershipDto(profile.data.membership),
    phoneMasked: maskIranianPhone(resolved.identity.phoneNational),
    engagement: membershipEngagementDto(profile.data.engagement),
  });
}

/** GET /api/v1/storefront/{slug}/me/orders */
export async function handleCustomerStorefrontMeOrders(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }

  const resolved = await resolvePortalMembership(
    ctx,
    session,
    slug,
    correlationId,
  );
  if (!resolved.ok) return resolved.result;

  if (!resolved.membership) {
    return ok({ storeId: resolved.store.id, membershipId: null, orders: [] });
  }

  const orders = await ctx.repos.orders.listByMembership({
    merchantId: resolved.store.merchantId,
    storeId: resolved.store.id,
    membershipId: resolved.membership.id,
    limit: 50,
  });

  return ok({
    storeId: resolved.store.id,
    membershipId: resolved.membership.id,
    orders: orders.map(orderDto),
  });
}

/** GET /api/v1/storefront/{slug}/me/history — completed POS sales. */
export async function handleCustomerStorefrontMeHistory(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }

  const resolved = await resolvePortalMembership(
    ctx,
    session,
    slug,
    correlationId,
  );
  if (!resolved.ok) return resolved.result;

  if (!resolved.membership) {
    return ok({ storeId: resolved.store.id, membershipId: null, sales: [] });
  }

  const sales = await ctx.repos.sales.listCompletedByMembershipId(
    resolved.membership.id,
  );
  const scoped = sales.filter((s) => s.storeId === resolved.store.id);

  return ok({
    storeId: resolved.store.id,
    membershipId: resolved.membership.id,
    sales: scoped.map(saleDto),
  });
}

/**
 * GET /api/v1/storefront/{slug}/me/rewards
 * Reward catalog not productized yet — honest empty list.
 */
export async function handleCustomerStorefrontMeRewards(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }

  const resolved = await resolvePortalMembership(
    ctx,
    session,
    slug,
    correlationId,
  );
  if (!resolved.ok) return resolved.result;

  return ok({
    storeId: resolved.store.id,
    membershipId: resolved.membership?.id ?? null,
    rewards: [] as Array<{ id: string; titleFa: string; pointsCost: number }>,
  });
}

/**
 * GET /api/v1/storefront/{slug}/me/receipts
 * Returns sale refs + signed download URLs when MinIO receipt present (ADR-111).
 */
export async function handleCustomerStorefrontMeReceipts(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }

  const resolved = await resolvePortalMembership(
    ctx,
    session,
    slug,
    correlationId,
  );
  if (!resolved.ok) return resolved.result;

  if (!resolved.membership) {
    return ok({ storeId: resolved.store.id, membershipId: null, receipts: [] });
  }

  const sales = await ctx.repos.sales.listCompletedByMembershipId(
    resolved.membership.id,
  );
  const scoped = sales.filter((s) => s.storeId === resolved.store.id);

  const {
    createValidatedPresignedDownload,
    MINIO_BUCKETS,
    PRESIGN_TTL_SECONDS,
  } = await import("../../../minio-storage/index.js");

  const receipts = [];
  for (const sale of scoped) {
    let downloadUrl: string | null = null;
    if (sale.receiptObjectKey && ctx.objectStorage) {
      try {
        const signed = await createValidatedPresignedDownload(
          ctx.objectStorage,
          {
            bucket: MINIO_BUCKETS.receipts,
            objectKey: sale.receiptObjectKey,
            expiresInSeconds: PRESIGN_TTL_SECONDS.download,
          },
        );
        downloadUrl = signed.url;
      } catch {
        downloadUrl = null;
      }
    }
    receipts.push({
      id: sale.id,
      receiptRef: sale.id,
      totalDisplayToman: saleDto(sale).totalDisplayToman,
      completedAt: sale.completedAt?.toISOString() ?? null,
      downloadUrl,
      refreshPath: downloadUrl
        ? `/api/v1/sales/${sale.id}/receipt`
        : null,
    });
  }

  return ok({
    storeId: resolved.store.id,
    membershipId: resolved.membership.id,
    receipts,
  });
}

/** Alias of wallet under me/ for ADR-103 path family. */
export async function handleCustomerStorefrontMeWallet(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  slug: string,
): Promise<HttpHandlerResult> {
  return handleCustomerStorefrontWallet(request, ctx, session, slug);
}
