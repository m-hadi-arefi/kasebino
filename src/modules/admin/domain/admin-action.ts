/**
 * AdminAction — enforcement audit record (ADR-013 / ARD-018).
 * OLTP trail; evidence plane also via AuditPort → mos_audit.
 */

export const ADMIN_ACTION_TYPES = [
  "merchant.list",
  "merchant.view",
  "merchant.activate",
  "merchant.suspend",
] as const;

export type AdminActionType = (typeof ADMIN_ACTION_TYPES)[number];

export const ADMIN_ACTION_RESULTS = ["success", "denied", "failed"] as const;
export type AdminActionResult = (typeof ADMIN_ACTION_RESULTS)[number];

export type AdminAction = {
  readonly id: string;
  readonly adminUserId: string;
  readonly action: AdminActionType;
  readonly merchantId: string | null;
  readonly result: AdminActionResult;
  readonly reason: string | null;
  /** Persian reason / note for ops (optional). */
  readonly reasonFa: string | null;
  readonly correlationId: string;
  readonly beforeStatus: string | null;
  readonly afterStatus: string | null;
  readonly createdAt: Date;
};

export type CreateAdminActionInput = {
  id: string;
  adminUserId: string;
  action: AdminActionType;
  merchantId?: string | null;
  result: AdminActionResult;
  reason?: string | null;
  reasonFa?: string | null;
  correlationId: string;
  beforeStatus?: string | null;
  afterStatus?: string | null;
  now?: Date;
};

export function createAdminAction(input: CreateAdminActionInput): AdminAction {
  return {
    id: input.id,
    adminUserId: input.adminUserId,
    action: input.action,
    merchantId: input.merchantId ?? null,
    result: input.result,
    reason: input.reason ?? null,
    reasonFa: input.reasonFa ?? null,
    correlationId: input.correlationId,
    beforeStatus: input.beforeStatus ?? null,
    afterStatus: input.afterStatus ?? null,
    createdAt: input.now ?? new Date(),
  };
}
