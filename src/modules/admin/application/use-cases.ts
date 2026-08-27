import { randomUUID } from "node:crypto";

import {
  ADMIN_DOMAIN_DECISION,
  ADMIN_PRIVILEGE_WARNINGS_FA,
} from "../domain/contracts/index.js";
import type { AuditPort } from "../../../infrastructure/security/contracts/audit-logging/index.js";
import {
  authorize,
  type AuthContext,
} from "../../../infrastructure/security/rbac/index.js";
import {
  activateMerchantAggregate,
  canAdminActivateFrom,
  canSuspendFrom,
  merchantActivatedEvent,
  merchantSuspendedEvent,
  suspendMerchantAggregate,
  type ListMerchantsInput,
  type Merchant,
  type MerchantRepository,
} from "../../merchant/domain/index.js";
import {
  createAdminAction,
  type AdminAction,
  type AdminActionRepository,
  type AdminUser,
  type AdminUserRepository,
  isAdminUserActive,
  adminActionRecordedEvent,
  adminMerchantActivatedEvent,
  adminMerchantSuspendedEvent,
} from "../domain/index.js";
import { AdminDomainError } from "./errors.js";
import type { SecurityMonitoringPort } from "./ports.js";

export type AdminUseCaseDeps = {
  adminUsers: AdminUserRepository;
  adminActions: AdminActionRepository;
  merchants: MerchantRepository;
  audit: AuditPort;
  securityMonitoring: SecurityMonitoringPort;
  now?: () => Date;
  idFactory?: () => string;
};

export type AdminActorInput = {
  /** Trusted AuthContext from JWT (ADR-033/034). */
  auth: AuthContext;
  correlationId?: string;
  ip?: string | null;
  userAgent?: string | null;
};

export type ListMerchantsForAdminInput = AdminActorInput & {
  status?: ListMerchantsInput["status"];
  limit?: number;
  offset?: number;
};

export type GetMerchantForAdminInput = AdminActorInput & {
  merchantId: string;
};

export type EnforceMerchantInput = AdminActorInput & {
  merchantId: string;
  reason?: string | null;
  reasonFa?: string | null;
};

function requirePlatformAdmin(auth: AuthContext): void {
  const isPlatformAdmin = auth.roles.includes("platform_admin");
  if (!isPlatformAdmin) {
    throw new AdminDomainError("FORBIDDEN_NOT_PLATFORM_ADMIN");
  }
  authorize(auth, {
    permission: ADMIN_DOMAIN_DECISION.permission,
    auditedCrossTenantAction: true,
  });
}

async function requireActiveAdminUser(
  deps: AdminUseCaseDeps,
  auth: AuthContext,
): Promise<AdminUser> {
  let admin = await deps.adminUsers.findById(auth.sub);
  if (!admin) {
    admin = await deps.adminUsers.findByLogin(auth.sub);
  }
  if (!admin) {
    throw new AdminDomainError("ADMIN_USER_NOT_FOUND");
  }
  if (!isAdminUserActive(admin)) {
    throw new AdminDomainError("ADMIN_USER_DISABLED");
  }
  return admin;
}

function correlationIdOf(input: AdminActorInput): string {
  return input.correlationId?.trim() || randomUUID();
}

async function persistAndAudit(input: {
  deps: AdminUseCaseDeps;
  admin: AdminUser;
  action: AdminAction["action"];
  merchantId: string | null;
  result: AdminAction["result"];
  reason?: string | null;
  reasonFa?: string | null;
  correlationId: string;
  beforeStatus?: string | null;
  afterStatus?: string | null;
  auditAction: string;
  actorInput: AdminActorInput;
  at: Date;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}): Promise<{
  adminAction: AdminAction;
  recordedEvent: ReturnType<typeof adminActionRecordedEvent>;
}> {
  const idFactory = input.deps.idFactory ?? (() => randomUUID());
  const adminAction = createAdminAction({
    id: idFactory(),
    adminUserId: input.admin.id,
    action: input.action,
    merchantId: input.merchantId,
    result: input.result,
    reason: input.reason ?? null,
    reasonFa: input.reasonFa ?? null,
    correlationId: input.correlationId,
    beforeStatus: input.beforeStatus ?? null,
    afterStatus: input.afterStatus ?? null,
    now: input.at,
  });
  await input.deps.adminActions.save(adminAction);

  await input.deps.audit.record({
    eventId: idFactory(),
    occurredAt: input.at,
    merchantId: input.merchantId,
    actorId: input.admin.id,
    actorRole: "platform_admin",
    action: input.auditAction,
    entityType: input.merchantId ? "Merchant" : "AdminAction",
    entityId: input.merchantId ?? adminAction.id,
    result: input.result === "success" ? "success" : "failure",
    ip: input.actorInput.ip ?? null,
    userAgent: input.actorInput.userAgent ?? null,
    correlationId: input.correlationId,
    before: input.before ?? {},
    after: input.after ?? {},
    metadata: {
      adminActionId: adminAction.id,
      adminActionType: input.action,
      privilegeWarningFa: ADMIN_PRIVILEGE_WARNINGS_FA.auditedAction,
    },
  });

  const recordedEvent = adminActionRecordedEvent({
    actionId: adminAction.id,
    adminUserId: input.admin.id,
    action: input.action,
    merchantId: input.merchantId,
    result: input.result,
    occurredAt: input.at,
  });

  return { adminAction, recordedEvent };
}

export function createAdminUseCases(deps: AdminUseCaseDeps) {
  const now = deps.now ?? (() => new Date());

  async function listMerchants(input: ListMerchantsForAdminInput): Promise<{
    merchants: Merchant[];
    privilegeWarningFa: string;
    adminAction: AdminAction;
  }> {
    requirePlatformAdmin(input.auth);
    const admin = await requireActiveAdminUser(deps, input.auth);
    const at = now();
    const correlationId = correlationIdOf(input);

    const merchants = await deps.merchants.list({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.offset !== undefined ? { offset: input.offset } : {}),
    });

    const { adminAction } = await persistAndAudit({
      deps,
      admin,
      action: "merchant.list",
      merchantId: null,
      result: "success",
      correlationId,
      auditAction: ADMIN_DOMAIN_DECISION.auditActions.platform,
      actorInput: input,
      at,
      after: { count: merchants.length },
    });

    return {
      merchants,
      privilegeWarningFa: ADMIN_PRIVILEGE_WARNINGS_FA.platformOnly,
      adminAction,
    };
  }

  async function getMerchant(input: GetMerchantForAdminInput): Promise<{
    merchant: Merchant;
    privilegeWarningFa: string;
    adminAction: AdminAction;
  }> {
    requirePlatformAdmin(input.auth);
    const admin = await requireActiveAdminUser(deps, input.auth);
    const at = now();
    const correlationId = correlationIdOf(input);

    const merchant = await deps.merchants.findById(input.merchantId);
    if (!merchant) {
      await persistAndAudit({
        deps,
        admin,
        action: "merchant.view",
        merchantId: input.merchantId,
        result: "failed",
        correlationId,
        auditAction: ADMIN_DOMAIN_DECISION.auditActions.platform,
        actorInput: input,
        at,
      });
      throw new AdminDomainError("MERCHANT_NOT_FOUND");
    }

    authorize(input.auth, {
      permission: ADMIN_DOMAIN_DECISION.permission,
      resourceMerchantId: merchant.id,
      auditedCrossTenantAction: true,
    });

    const { adminAction } = await persistAndAudit({
      deps,
      admin,
      action: "merchant.view",
      merchantId: merchant.id,
      result: "success",
      correlationId,
      beforeStatus: merchant.status,
      afterStatus: merchant.status,
      auditAction: ADMIN_DOMAIN_DECISION.auditActions.platform,
      actorInput: input,
      at,
      after: { status: merchant.status, tradeName: merchant.tradeName },
    });

    return {
      merchant,
      privilegeWarningFa: ADMIN_PRIVILEGE_WARNINGS_FA.platformOnly,
      adminAction,
    };
  }

  async function activateMerchant(input: EnforceMerchantInput): Promise<{
    merchant: Merchant;
    adminAction: AdminAction;
    events: Array<
      | ReturnType<typeof adminMerchantActivatedEvent>
      | ReturnType<typeof merchantActivatedEvent>
      | ReturnType<typeof adminActionRecordedEvent>
    >;
    privilegeWarningFa: string;
  }> {
    requirePlatformAdmin(input.auth);
    const admin = await requireActiveAdminUser(deps, input.auth);
    const at = now();
    const correlationId = correlationIdOf(input);

    const merchant = await deps.merchants.findById(input.merchantId);
    if (!merchant) {
      throw new AdminDomainError("MERCHANT_NOT_FOUND");
    }

    authorize(input.auth, {
      permission: ADMIN_DOMAIN_DECISION.permission,
      resourceMerchantId: merchant.id,
      auditedCrossTenantAction: true,
    });

    if (merchant.status === "active") {
      throw new AdminDomainError("ALREADY_ACTIVE");
    }
    if (!canAdminActivateFrom(merchant.status)) {
      throw new AdminDomainError("INVALID_ACTIVATE_TRANSITION");
    }

    const previousStatus = merchant.status;
    activateMerchantAggregate(merchant, at);
    await deps.merchants.update(merchant);

    const { adminAction, recordedEvent } = await persistAndAudit({
      deps,
      admin,
      action: "merchant.activate",
      merchantId: merchant.id,
      result: "success",
      reason: input.reason ?? null,
      reasonFa: input.reasonFa ?? null,
      correlationId,
      beforeStatus: previousStatus,
      afterStatus: merchant.status,
      auditAction: ADMIN_DOMAIN_DECISION.auditActions.activate,
      actorInput: input,
      at,
      before: { status: previousStatus },
      after: { status: merchant.status },
    });

    const adminEvent = adminMerchantActivatedEvent({
      merchantId: merchant.id,
      adminUserId: admin.id,
      previousStatus,
      activatedAt: at,
      occurredAt: at,
    });
    const merchantEvent = merchantActivatedEvent({
      merchantId: merchant.id,
      activatedAt: at,
      occurredAt: at,
    });

    await deps.securityMonitoring.recordAdminSignal({
      type: "AdminMerchantActivated",
      merchantId: merchant.id,
      adminUserId: admin.id,
      occurredAt: at,
      metadata: { previousStatus },
    });

    return {
      merchant,
      adminAction,
      events: [adminEvent, merchantEvent, recordedEvent],
      privilegeWarningFa: ADMIN_PRIVILEGE_WARNINGS_FA.activateConfirm,
    };
  }

  async function suspendMerchant(input: EnforceMerchantInput): Promise<{
    merchant: Merchant;
    adminAction: AdminAction;
    events: Array<
      | ReturnType<typeof adminMerchantSuspendedEvent>
      | ReturnType<typeof merchantSuspendedEvent>
      | ReturnType<typeof adminActionRecordedEvent>
    >;
    privilegeWarningFa: string;
  }> {
    requirePlatformAdmin(input.auth);
    const admin = await requireActiveAdminUser(deps, input.auth);
    const at = now();
    const correlationId = correlationIdOf(input);

    const merchant = await deps.merchants.findById(input.merchantId);
    if (!merchant) {
      throw new AdminDomainError("MERCHANT_NOT_FOUND");
    }

    authorize(input.auth, {
      permission: ADMIN_DOMAIN_DECISION.permission,
      resourceMerchantId: merchant.id,
      auditedCrossTenantAction: true,
    });

    if (merchant.status === "suspended") {
      throw new AdminDomainError("ALREADY_SUSPENDED");
    }
    if (!canSuspendFrom(merchant.status)) {
      throw new AdminDomainError("INVALID_SUSPEND_TRANSITION");
    }

    const previousStatus = merchant.status;
    const reason = input.reason?.trim() || null;
    suspendMerchantAggregate(merchant, at);
    await deps.merchants.update(merchant);

    const { adminAction, recordedEvent } = await persistAndAudit({
      deps,
      admin,
      action: "merchant.suspend",
      merchantId: merchant.id,
      result: "success",
      reason,
      reasonFa: input.reasonFa ?? null,
      correlationId,
      beforeStatus: previousStatus,
      afterStatus: merchant.status,
      auditAction: ADMIN_DOMAIN_DECISION.auditActions.suspend,
      actorInput: input,
      at,
      before: { status: previousStatus },
      after: { status: merchant.status, reason },
    });

    const adminEvent = adminMerchantSuspendedEvent({
      merchantId: merchant.id,
      adminUserId: admin.id,
      previousStatus,
      reason,
      suspendedAt: at,
      occurredAt: at,
    });
    const merchantEvent = merchantSuspendedEvent({
      merchantId: merchant.id,
      suspendedAt: at,
      reason,
      actorAdminUserId: admin.id,
      occurredAt: at,
    });

    await deps.securityMonitoring.recordAdminSignal({
      type: "AdminMerchantSuspended",
      merchantId: merchant.id,
      adminUserId: admin.id,
      occurredAt: at,
      metadata: { previousStatus, reason },
    });

    return {
      merchant,
      adminAction,
      events: [adminEvent, merchantEvent, recordedEvent],
      privilegeWarningFa: ADMIN_PRIVILEGE_WARNINGS_FA.enforcementIrreversibleHint,
    };
  }

  return {
    listMerchants,
    getMerchant,
    activateMerchant,
    suspendMerchant,
  };
}

export type AdminUseCases = ReturnType<typeof createAdminUseCases>;
