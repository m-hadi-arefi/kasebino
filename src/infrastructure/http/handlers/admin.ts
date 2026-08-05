import { z } from "zod";

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { merchantDto } from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import { clientIp, enforceRateLimit } from "../rate-limit.js";
import { requireAdminPermission } from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

const enforceSchema = z.object({
  reason: z.string().nullable().optional(),
  reasonFa: z.string().nullable().optional(),
});

async function enforceAdminRateLimit(input: {
  request: HttpRequestLike;
  ctx: ApiContext;
  correlationId: string;
  adminUserId: string;
}): Promise<HttpHandlerResult | null> {
  return enforceRateLimit({
    ctx: input.ctx,
    request: input.request,
    scope: "admin",
    subjectRaw: `admin:${input.adminUserId}:${clientIp(input.request)}`,
    correlationId: input.correlationId,
  });
}

export async function handleAdminListMerchants(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const admin = requireAdminPermission(session, correlationId);
  if (!admin.ok) return admin.result;
  const limited = await enforceAdminRateLimit({
    request,
    ctx,
    correlationId,
    adminUserId: admin.actor.userId,
  });
  if (limited) return limited;

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status");
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const status =
    statusRaw === "draft" ||
    statusRaw === "active" ||
    statusRaw === "suspended"
      ? statusRaw
      : undefined;

  const ran = await runUseCase(correlationId, () =>
    ctx.admin.listMerchants({
      auth: admin.auth,
      correlationId,
      ...(status !== undefined ? { status } : {}),
      ...(limitRaw ? { limit: Number(limitRaw) } : {}),
      ...(offsetRaw ? { offset: Number(offsetRaw) } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    merchants: ran.data.merchants.map(merchantDto),
    privilegeWarningFa: ran.data.privilegeWarningFa,
  });
}

export async function handleAdminGetMerchant(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  merchantId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const admin = requireAdminPermission(session, correlationId, {
    resourceMerchantId: merchantId,
  });
  if (!admin.ok) return admin.result;
  const limited = await enforceAdminRateLimit({
    request,
    ctx,
    correlationId,
    adminUserId: admin.actor.userId,
  });
  if (limited) return limited;
  const ran = await runUseCase(correlationId, () =>
    ctx.admin.getMerchant({
      auth: admin.auth,
      merchantId,
      correlationId,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    merchant: merchantDto(ran.data.merchant),
    privilegeWarningFa: ran.data.privilegeWarningFa,
  });
}

export async function handleAdminActivateMerchant(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  merchantId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const admin = requireAdminPermission(session, correlationId, {
    resourceMerchantId: merchantId,
  });
  if (!admin.ok) return admin.result;
  const limited = await enforceAdminRateLimit({
    request,
    ctx,
    correlationId,
    adminUserId: admin.actor.userId,
  });
  if (limited) return limited;
  const parsed = await parseBody(request, enforceSchema, correlationId);
  const body = parsed.ok ? parsed.data : {};
  const ran = await runUseCase(correlationId, () =>
    ctx.admin.activateMerchant({
      auth: admin.auth,
      merchantId,
      correlationId,
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
      ...(body.reasonFa !== undefined ? { reasonFa: body.reasonFa } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    merchant: merchantDto(ran.data.merchant),
    privilegeWarningFa: ran.data.privilegeWarningFa,
  });
}

export async function handleAdminSuspendMerchant(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  merchantId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const admin = requireAdminPermission(session, correlationId, {
    resourceMerchantId: merchantId,
  });
  if (!admin.ok) return admin.result;
  const limited = await enforceAdminRateLimit({
    request,
    ctx,
    correlationId,
    adminUserId: admin.actor.userId,
  });
  if (limited) return limited;
  const parsed = await parseBody(request, enforceSchema, correlationId);
  const body = parsed.ok ? parsed.data : {};
  const ran = await runUseCase(correlationId, () =>
    ctx.admin.suspendMerchant({
      auth: admin.auth,
      merchantId,
      correlationId,
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
      ...(body.reasonFa !== undefined ? { reasonFa: body.reasonFa } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({
    merchant: merchantDto(ran.data.merchant),
    privilegeWarningFa: ran.data.privilegeWarningFa,
  });
}

/** ADR-106 — admin audit viewer (PG admin_actions + optional AuditStore). */
export async function handleAdminListAudit(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const admin = requireAdminPermission(session, correlationId);
  if (!admin.ok) return admin.result;
  const limited = await enforceAdminRateLimit({
    request,
    ctx,
    correlationId,
    adminUserId: admin.actor.userId,
  });
  if (limited) return limited;

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.min(200, Math.max(1, Number(limitRaw))) : 50;

  const actions = await ctx.repos.adminActions.listRecent({ limit });

  let auditDocs: Array<Record<string, unknown>> = [];
  if (ctx.auditStore) {
    auditDocs = (await ctx.auditStore.search({
      includePlatformScope: true,
      limit,
    })) as unknown as Array<Record<string, unknown>>;
  }

  return ok({
    actions: actions.map((a) => ({
      id: a.id,
      adminUserId: a.adminUserId,
      action: a.action,
      merchantId: a.merchantId,
      result: a.result,
      reason: a.reason,
      reasonFa: a.reasonFa,
      correlationId: a.correlationId,
      beforeStatus: a.beforeStatus,
      afterStatus: a.afterStatus,
      createdAt: a.createdAt.toISOString(),
    })),
    audit: auditDocs,
  });
}
