/**
 * ADR-094 / ADR-098 / ADR-113 CRM membership handlers.
 */

import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import {
  isCrmSegment,
  type CrmSegment,
} from "../../../modules/crm/domain/segments.js";
import {
  membershipDto,
  membershipEngagementDto,
  membershipListItemDto,
  saleDto,
} from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import {
  requireMerchantAuthResolved,
  requireMerchantPermissionResolved,
} from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const joinSchema = z.object({
  storeId: z.string().min(1),
  phone: z.string().min(1),
  source: z.enum(["qr", "storefront", "pickup"]),
  consentCheckboxAccepted: z.boolean(),
  consentCheckboxVersion: z.string().optional(),
  merchantId: z.string().optional(),
});

async function assertStoreOwnedByMerchant(
  ctx: ApiContext,
  storeId: string,
  merchantId: string,
  correlationId: string,
): Promise<HttpHandlerResult | null> {
  const store = await ctx.repos.stores.findById(storeId);
  if (!store || store.merchantId !== merchantId) {
    return fail({
      code: "FORBIDDEN",
      correlationId,
      status: 403,
      messageFa: "اجازه دسترسی به این فروشگاه را ندارید.",
    });
  }
  return null;
}

export async function handleListMemberships(
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
  if (!storeId) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: "شناسه فروشگاه (storeId) الزامی است.",
    });
  }
  const segmentRaw = url.searchParams.get("segment")?.trim() ?? "";
  let segment: CrmSegment | undefined;
  if (segmentRaw) {
    if (!isCrmSegment(segmentRaw)) {
      return fail({
        code: "VALIDATION_ERROR",
        correlationId,
        status: 400,
        messageFa: "بخش نامعتبر است. یکی از: new، returning، lapsed.",
      });
    }
    segment = segmentRaw;
  }

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "crm.read",
    resourceStoreId: storeId,
  });
  if (!auth.ok) return auth.result;

  const denied = await assertStoreOwnedByMerchant(
    ctx,
    storeId,
    auth.actor.merchantId,
    correlationId,
  );
  if (denied) return denied;

  const ran = await runUseCase(correlationId, () =>
    ctx.crm.listStoreMemberships({
      merchantId: auth.actor.merchantId,
      storeId,
      ...(segment !== undefined ? { segment } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    memberships: ran.data.items.map(membershipListItemDto),
  });
}

export async function handleGetMembership(
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
  const existing = await ctx.repos.storeMemberships.findById(membershipId);
  if (
    !existing ||
    existing.merchantId !== pre.actor.merchantId ||
    existing.deletedAt !== null
  ) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "crm.read",
    resourceStoreId: existing.storeId,
  });
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.crm.getMembershipProfile({ membershipId }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    membership: membershipDto(ran.data.membership),
    engagement: membershipEngagementDto(ran.data.engagement),
  });
}

export async function handleGetMembershipHistory(
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
  const existing = await ctx.repos.storeMemberships.findById(membershipId);
  if (
    !existing ||
    existing.merchantId !== pre.actor.merchantId ||
    existing.deletedAt !== null
  ) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "crm.read",
    resourceStoreId: existing.storeId,
  });
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.crm.listMembershipHistory({ membershipId }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    membershipId: ran.data.membership.id,
    sales: ran.data.sales.map(saleDto),
  });
}

export async function handleGetStoreSegments(
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
    permission: "crm.read",
    resourceStoreId: storeId,
  });
  if (!auth.ok) return auth.result;

  const denied = await assertStoreOwnedByMerchant(
    ctx,
    storeId,
    auth.actor.merchantId,
    correlationId,
  );
  if (denied) return denied;

  const ran = await runUseCase(correlationId, () =>
    ctx.crm.getStoreSegments({
      merchantId: auth.actor.merchantId,
      storeId,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    storeId: ran.data.storeId,
    totalActive: ran.data.totalActive,
    counts: ran.data.counts,
  });
}

export async function handleJoinMembership(
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
  const parsed = await parseBody(request, joinSchema, correlationId);
  if (!parsed.ok) return parsed.result;
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "crm.write",
    bodyMerchantId: parsed.data.merchantId,
    resourceStoreId: parsed.data.storeId,
  });
  if (!auth.ok) return auth.result;
  const ran = await runUseCase(correlationId, () =>
    ctx.crm.joinWithDigitalConsent({
      merchantId: auth.actor.merchantId,
      storeId: parsed.data.storeId,
      phone: parsed.data.phone,
      source: parsed.data.source,
      consentCheckboxAccepted: parsed.data.consentCheckboxAccepted,
      ...(parsed.data.consentCheckboxVersion !== undefined
        ? { consentCheckboxVersion: parsed.data.consentCheckboxVersion }
        : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok(
    {
      membership: membershipDto(ran.data.membership),
      created: ran.data.created,
      consentCheckboxLabelFa: ran.data.consentCheckboxLabelFa,
    },
    { status: ran.data.created ? 201 : 200 },
  );
}

export async function handleDeleteMembership(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  membershipId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "DELETE") {
    return methodNotAllowed(correlationId, "DELETE");
  }
  const pre = await requireMerchantAuthResolved(session, correlationId, ctx.repos.merchants);
  if (!pre.ok) return pre.result;
  const existing = await ctx.repos.storeMemberships.findById(membershipId);
  if (!existing || existing.merchantId !== pre.actor.merchantId) {
    return fail({ code: "NOT_FOUND", correlationId, status: 404 });
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "crm.write",
    bodyMerchantId: existing.merchantId,
    resourceStoreId: existing.storeId,
  });
  if (!auth.ok) return auth.result;
  const ran = await runUseCase(correlationId, () =>
    ctx.crm.softDeleteMembership({ membershipId }),
  );
  if (!ran.ok) return ran.result;
  return ok({ membership: membershipDto(ran.data.membership) });
}
