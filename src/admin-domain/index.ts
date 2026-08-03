/**
 * ADR-013 — Admin Domain contract.
 *
 * Separate platform_admin role; merchant activate/suspend enforcement;
 * every action audited via AuditPort. Admin UI stubs → ADR-089
 * (`src/admin-dashboard`); HTTP → ARD-018.
 * Security monitoring hooks → ARD-026.
 */

export const ADMIN_ROLE = "platform_admin" as const;

export const ADMIN_ENFORCEMENT_ACTIONS = [
  "merchant.activate",
  "merchant.suspend",
  "merchant.view",
  "merchant.list",
] as const;

export type AdminEnforcementAction =
  (typeof ADMIN_ENFORCEMENT_ACTIONS)[number];

export const ADMIN_DOMAIN_EVENTS = [
  "AdminActionRecorded",
  "AdminMerchantActivated",
  "AdminMerchantSuspended",
] as const;

export type AdminDomainEventName = (typeof ADMIN_DOMAIN_EVENTS)[number];

/**
 * Binding decision snapshot (ADR-013 + ADR-034 + ADR-058).
 */
export const ADMIN_DOMAIN_DECISION = {
  aggregateRoot: "AdminUser",
  actionAggregate: "AdminAction",
  module: "admin",
  audience: ADMIN_ROLE,
  permission: "admin.platform" as const,
  merchantApisMustNotImplyAdmin: true,
  enforcementActions: ADMIN_ENFORCEMENT_ACTIONS,
  auditEveryAction: true,
  auditVia: "AuditPort" as const,
  auditActions: {
    activate: "merchant.activate",
    suspend: "merchant.suspend",
    platform: "admin.platform_action",
  } as const,
  securityMonitoringHooks: true,
  securityMonitoringDeferredTo: "ARD-026",
  apiDeferredTo: "ARD-018",
  uiImplementedIn: "src/admin-dashboard/",
  uiHttpDeferredTo: "ARD-018",
  events: ADMIN_DOMAIN_EVENTS,
  merchantLifecycle: {
    activateFrom: ["draft", "suspended"] as const,
    suspendFrom: ["active"] as const,
  },
  defaultLocale: "fa-IR" as const,
  rtlAdminUi: true,
} as const;

/**
 * Iranian First — Persian privilege warnings and ops copy (domain contract).
 */
export const ADMIN_PRIVILEGE_WARNINGS_FA = {
  platformOnly:
    "این بخش فقط برای مدیران پلتفرم است. دسترسی کارکنان فروشگاه مجاز نیست.",
  enforcementIrreversibleHint:
    "تعلیق فروشنده دسترسی به صندوق و ویترین را قطع می‌کند. با دقت اقدام کنید.",
  activateConfirm:
    "با فعال‌سازی، فروشنده می‌تواند از صندوق و ویترین استفاده کند.",
  suspendConfirm:
    "با تعلیق، صندوق و ویترین این فروشنده غیرفعال می‌شوند.",
  auditedAction:
    "همه اقدامات مدیریتی ثبت و ممیزی می‌شوند.",
} as const;

export const ADMIN_ACTION_LABELS_FA = {
  "merchant.activate": "فعال‌سازی فروشنده",
  "merchant.suspend": "تعلیق فروشنده",
  "merchant.view": "مشاهده فروشنده",
  "merchant.list": "فهرست فروشندگان",
} as const satisfies Record<AdminEnforcementAction, string>;

/** Optional short-TTL list cache note — Redis later. */
export const ADMIN_LIST_CACHE = {
  keyHint: "mos:{env}:admin:merchants:list",
  ttlSeconds: 30,
  invalidateOn: [
    "AdminMerchantActivated",
    "AdminMerchantSuspended",
    "MerchantActivated",
    "MerchantSuspended",
  ] as const,
} as const;

export function isAdminEnforcementAction(
  value: string,
): value is AdminEnforcementAction {
  return (ADMIN_ENFORCEMENT_ACTIONS as readonly string[]).includes(value);
}

export function adminActionLabelFa(action: AdminEnforcementAction): string {
  return ADMIN_ACTION_LABELS_FA[action];
}

export function assertPlatformAdminAudience(role: string): void {
  if (role !== ADMIN_ROLE) {
    throw new Error(
      `Admin domain requires ${ADMIN_ROLE} (ADR-013); got "${role}".`,
    );
  }
}

export const ADMIN_DOMAIN = {
  decision: ADMIN_DOMAIN_DECISION,
  events: ADMIN_DOMAIN_EVENTS,
  privilegeWarningsFa: ADMIN_PRIVILEGE_WARNINGS_FA,
  actionLabelsFa: ADMIN_ACTION_LABELS_FA,
  cache: ADMIN_LIST_CACHE,
} as const;
