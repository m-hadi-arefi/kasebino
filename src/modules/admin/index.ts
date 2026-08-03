/**
 * Admin bounded context — ADR-013 Admin Domain.
 * platform_admin only; merchant activate/suspend; AuditPort on every action.
 * HTTP/UI → ARD-018 / ADR-089. Security monitoring → ARD-026.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
export {
  ADMIN_DOMAIN,
  ADMIN_DOMAIN_DECISION,
  ADMIN_DOMAIN_EVENTS,
  ADMIN_PRIVILEGE_WARNINGS_FA,
  ADMIN_ACTION_LABELS_FA,
  adminActionLabelFa,
  assertPlatformAdminAudience,
} from "../../admin-domain/index.js";
