/**
 * ADR-094 / ADR-107 / ADR-113 notifications handlers.
 * Merchant staff + customer portal; audience + tenant scoped.
 */

import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { notificationDto } from "../dtos.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
} from "../envelopes.js";
import {
  requireCustomerAuth,
  requireMerchantPermissionResolved,
} from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

type NotificationActor =
  | {
      kind: "merchant";
      merchantId: string;
      userId: string;
      audience: "merchant";
      storeId?: undefined;
      recipientUserIds?: undefined;
    }
  | {
      kind: "customer";
      merchantId: string;
      userId: string;
      audience: "customer";
      storeId: string;
      recipientUserIds: string[];
    };

async function resolveNotificationActor(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  correlationId: string,
): Promise<
  | { ok: true; actor: NotificationActor }
  | { ok: false; result: HttpHandlerResult }
> {
  const merchant = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    {
    permission: "merchant.read",
  });
  if (merchant.ok) {
    return {
      ok: true,
      actor: {
        kind: "merchant",
        merchantId: merchant.actor.merchantId,
        userId: merchant.actor.userId,
        audience: "merchant",
      },
    };
  }

  const customer = requireCustomerAuth(session, correlationId);
  if (!customer.ok) {
    return merchant;
  }

  const storeIdParam =
    new URL(request.url).searchParams.get("storeId")?.trim() ||
    customer.actor.storeId;
  if (!storeIdParam) {
    return {
      ok: false,
      result: fail({
        code: "VALIDATION_ERROR",
        correlationId,
        status: 400,
        messageFa: "شناسه فروشگاه (storeId) الزامی است.",
      }),
    };
  }

  const store = await ctx.repos.stores.findById(storeIdParam);
  if (!store) {
    return {
      ok: false,
      result: fail({
        code: "NOT_FOUND",
        correlationId,
        status: 404,
        messageFa: "فروشگاه پیدا نشد.",
      }),
    };
  }
  if (customer.actor.storeId && customer.actor.storeId !== store.id) {
    return {
      ok: false,
      result: fail({
        code: "FORBIDDEN",
        correlationId,
        status: 403,
        messageFa: "این نشست متعلق به فروشگاه دیگری است.",
      }),
    };
  }

  const recipientUserIds = [customer.actor.userId];
  const identities = ctx.repos.customerIdentities;
  if (identities) {
    const identity = await identities.findById(customer.actor.userId);
    if (identity) {
      const membership = await ctx.repos.storeMemberships.findByStoreAndPhone(
        store.id,
        identity.phoneNational,
      );
      if (membership?.customerId) {
        recipientUserIds.push(membership.customerId);
      }
    }
  }

  return {
    ok: true,
    actor: {
      kind: "customer",
      merchantId: store.merchantId,
      userId: customer.actor.userId,
      audience: "customer",
      storeId: store.id,
      recipientUserIds: [...new Set(recipientUserIds)],
    },
  };
}

export async function handleListNotifications(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const resolved = await resolveNotificationActor(
    request,
    ctx,
    session,
    correlationId,
  );
  if (!resolved.ok) return resolved.result;

  const unreadOnly =
    new URL(request.url).searchParams.get("unreadOnly") === "true";

  const listInput =
    resolved.actor.kind === "customer"
      ? {
          merchantId: resolved.actor.merchantId,
          audience: resolved.actor.audience,
          recipientUserIds: resolved.actor.recipientUserIds,
          storeId: resolved.actor.storeId,
          unreadOnly,
        }
      : {
          merchantId: resolved.actor.merchantId,
          audience: resolved.actor.audience,
          userId: resolved.actor.userId,
          unreadOnly,
        };

  const ran = await runUseCase(correlationId, () =>
    ctx.notifications.list(listInput),
  );
  if (!ran.ok) return ran.result;

  const unread = await runUseCase(correlationId, () =>
    resolved.actor.kind === "customer"
      ? ctx.notifications.countUnread(
          resolved.actor.merchantId,
          undefined,
          resolved.actor.audience,
          {
            recipientUserIds: resolved.actor.recipientUserIds,
            storeId: resolved.actor.storeId,
          },
        )
      : ctx.notifications.countUnread(
          resolved.actor.merchantId,
          resolved.actor.userId,
          resolved.actor.audience,
        ),
  );
  if (!unread.ok) return unread.result;

  return ok({
    notifications: ran.data.map(notificationDto),
    unreadCount: unread.data,
  });
}

export async function handleMarkNotificationRead(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  notificationId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const resolved = await resolveNotificationActor(
    request,
    ctx,
    session,
    correlationId,
  );
  if (!resolved.ok) return resolved.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.notifications.markRead({
      merchantId: resolved.actor.merchantId,
      notificationId,
      audience: resolved.actor.audience,
      ...(resolved.actor.kind === "customer"
        ? { recipientUserIds: resolved.actor.recipientUserIds }
        : { userId: resolved.actor.userId }),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ notification: notificationDto(ran.data) });
}
