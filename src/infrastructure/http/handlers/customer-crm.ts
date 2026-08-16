/**
 * Kasbino Merchant Customer CRM HTTP Handlers.
 */

import { z } from "zod";
import type { AuthSessionSnapshot } from "../../auth/session-guard.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import type { CustomerStatus, CustomerType } from "../../../modules/crm/domain/customer.js";
import { runUseCase } from "../domain-error.js";
import {
  correlationIdFrom,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import { requireMerchantPermissionResolved } from "../require-auth.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";


const createCustomerSchema = z.object({
  storeId: z.string().optional(),
  phone: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  customerType: z.enum(["retail", "wholesale"]).optional(),
  preferredContactMethod: z.enum(["phone", "sms", "email", "whatsapp"]).optional(),
  notes: z.string().optional().nullable(),
});

const updateCustomerSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  customerType: z.enum(["retail", "wholesale"]).optional(),
  status: z.enum(["active", "inactive", "vip", "blocked", "archived"]).optional(),
  preferredContactMethod: z.enum(["phone", "sms", "email", "whatsapp"]).optional(),
  notes: z.string().optional().nullable(),
});

const noteSchema = z.object({
  content: z.string().min(1),
  isPrivate: z.boolean().optional(),
});

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

const assignTagSchema = z.object({
  tagId: z.string().min(1),
});

const interactionSchema = z.object({
  storeId: z.string().optional(),
  type: z.enum(["call", "message", "visit", "follow_up", "note", "other"]),
  description: z.string().min(1),
  followUpDate: z.string().optional(),
});

const followUpSchema = z.object({
  customerId: z.string().min(1),
  storeId: z.string().optional(),
  assigneeId: z.string().min(1),
  assigneeName: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.string().min(1),
});

const followUpStatusSchema = z.object({
  status: z.enum(["OPEN", "DONE", "CANCELLED"]),
});

export async function handleListCustomers(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.read" },
  );
  if (!auth.ok) return auth.result;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const status = (url.searchParams.get("status") as CustomerStatus) || undefined;
  const customerType =
    (url.searchParams.get("customerType") as CustomerType) || undefined;
  const limit = url.searchParams.get("limit")
    ? parseInt(url.searchParams.get("limit")!, 10)
    : 50;
  const offset = url.searchParams.get("offset")
    ? parseInt(url.searchParams.get("offset")!, 10)
    : 0;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.listCustomers({
      merchantId: auth.actor.merchantId,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(customerType ? { customerType } : {}),
      limit,
      offset,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok(ran.data);
}

export async function handleCreateCustomer(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const parsed = await parseBody(request, createCustomerSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.createCustomer({
      merchantId: auth.actor.merchantId,
      phone: parsed.data.phone,
      displayName: parsed.data.displayName,
      ...(parsed.data.storeId !== undefined ? { storeId: parsed.data.storeId } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
      ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
      ...(parsed.data.city !== undefined ? { city: parsed.data.city } : {}),
      ...(parsed.data.postalCode !== undefined ? { postalCode: parsed.data.postalCode } : {}),
      ...(parsed.data.customerType !== undefined ? { customerType: parsed.data.customerType } : {}),
      ...(parsed.data.preferredContactMethod !== undefined ? { preferredContactMethod: parsed.data.preferredContactMethod } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ customer: ran.data }, { status: 201 });
}

export async function handleGetCustomer360(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.read" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.getCustomer360(customerId, auth.actor.merchantId),
  );
  if (!ran.ok) return ran.result;
  return ok(ran.data);
}

export async function handleUpdateCustomer(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "PATCH") {
    return methodNotAllowed(correlationId, "PATCH");
  }
  const parsed = await parseBody(request, updateCustomerSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.updateCustomer({
      merchantId: auth.actor.merchantId,
      customerId,
      ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
      ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
      ...(parsed.data.city !== undefined ? { city: parsed.data.city } : {}),
      ...(parsed.data.postalCode !== undefined ? { postalCode: parsed.data.postalCode } : {}),
      ...(parsed.data.customerType !== undefined ? { customerType: parsed.data.customerType } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.preferredContactMethod !== undefined ? { preferredContactMethod: parsed.data.preferredContactMethod } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ customer: ran.data });
}

export async function handleArchiveCustomer(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "DELETE") {
    return methodNotAllowed(correlationId, "DELETE");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.archiveCustomer(customerId, auth.actor.merchantId),
  );
  if (!ran.ok) return ran.result;
  return ok({ customer: ran.data });
}

export async function handleGetCustomerTimeline(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.read" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.getCustomerTimeline(customerId, auth.actor.merchantId),
  );
  if (!ran.ok) return ran.result;
  return ok({ events: ran.data });
}

export async function handleAddCustomerNote(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const parsed = await parseBody(request, noteSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.addNote({
      merchantId: auth.actor.merchantId,
      customerId,
      authorId: auth.actor.userId,
      authorName: (session?.user as Record<string, unknown> | undefined)?.name as string ?? "کاربر سیستم",
      content: parsed.data.content,
      ...(parsed.data.isPrivate !== undefined ? { isPrivate: parsed.data.isPrivate } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ note: ran.data }, { status: 201 });
}

export async function handleDeleteCustomerNote(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  noteId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "DELETE") {
    return methodNotAllowed(correlationId, "DELETE");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.deleteNote(noteId, auth.actor.merchantId),
  );
  if (!ran.ok) return ran.result;
  return ok({ deleted: true });
}

export async function handleListCrmTags(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.read" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.listTags(auth.actor.merchantId),
  );
  if (!ran.ok) return ran.result;
  return ok({ tags: ran.data });
}

export async function handleAssignCrmTag(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const parsed = await parseBody(request, assignTagSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.assignTag({
      merchantId: auth.actor.merchantId,
      customerId,
      tagId: parsed.data.tagId,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ assigned: true });
}

export async function handleRemoveCrmTag(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
  tagId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "DELETE") {
    return methodNotAllowed(correlationId, "DELETE");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.removeTag({
      merchantId: auth.actor.merchantId,
      customerId,
      tagId,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ removed: true });
}

export async function handleCreateCrmTag(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const parsed = await parseBody(request, tagSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.createTag({
      merchantId: auth.actor.merchantId,
      name: parsed.data.name,
      ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ tag: ran.data }, { status: 201 });
}

export async function handleLogCustomerInteraction(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  customerId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const parsed = await parseBody(request, interactionSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.logInteraction({
      merchantId: auth.actor.merchantId,
      customerId,
      ...(parsed.data.storeId !== undefined ? { storeId: parsed.data.storeId } : {}),
      staffId: auth.actor.userId,
      staffName: (session?.user as Record<string, unknown> | undefined)?.name as string ?? "کاربر سیستم",
      type: parsed.data.type,
      description: parsed.data.description,
      followUpDate: parsed.data.followUpDate
        ? new Date(parsed.data.followUpDate)
        : null,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ interaction: ran.data }, { status: 201 });
}

export async function handleCreateFollowUp(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const parsed = await parseBody(request, followUpSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.createFollowUp({
      merchantId: auth.actor.merchantId,
      customerId: parsed.data.customerId,
      ...(parsed.data.storeId !== undefined ? { storeId: parsed.data.storeId } : {}),
      assigneeId: parsed.data.assigneeId,
      assigneeName: parsed.data.assigneeName,
      description: parsed.data.description,
      dueDate: new Date(parsed.data.dueDate),
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ followUp: ran.data }, { status: 201 });
}

export async function handleUpdateFollowUpStatus(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
  followUpId: string,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "PATCH") {
    return methodNotAllowed(correlationId, "PATCH");
  }
  const parsed = await parseBody(request, followUpStatusSchema, correlationId);
  if (!parsed.ok) return parsed.result;

  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.write" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.updateFollowUpStatus({
      merchantId: auth.actor.merchantId,
      followUpId,
      status: parsed.data.status,
    }),
  );
  if (!ran.ok) return ran.result;
  return ok({ success: true });
}

export async function handleGetCrmDashboard(
  request: HttpRequestLike,
  ctx: ApiContext,
  session: AuthSessionSnapshot,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "GET") {
    return methodNotAllowed(correlationId, "GET");
  }
  const auth = await requireMerchantPermissionResolved(
    session,
    correlationId,
    ctx.repos.merchants,
    { permission: "crm.read" },
  );
  if (!auth.ok) return auth.result;

  const ran = await runUseCase(correlationId, () =>
    ctx.customerCrm.getCrmDashboardMetrics(auth.actor.merchantId),
  );
  if (!ran.ok) return ran.result;
  return ok(ran.data);
}
