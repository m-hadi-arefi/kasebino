import { describe, expect, it } from "vitest";

import {
  ADMIN_DOMAIN,
  ADMIN_DOMAIN_DECISION,
  ADMIN_DOMAIN_EVENTS,
  ADMIN_PRIVILEGE_WARNINGS_FA,
  assertPlatformAdminAudience,
  isAdminEnforcementAction,
} from "./index.js";

describe("ADR-013 admin-domain contract", () => {
  it("locks platform_admin audience and AuditPort enforcement", () => {
    expect(ADMIN_DOMAIN_DECISION.audience).toBe("platform_admin");
    expect(ADMIN_DOMAIN_DECISION.permission).toBe("admin.platform");
    expect(ADMIN_DOMAIN_DECISION.auditEveryAction).toBe(true);
    expect(ADMIN_DOMAIN_DECISION.auditVia).toBe("AuditPort");
    expect(ADMIN_DOMAIN_DECISION.merchantApisMustNotImplyAdmin).toBe(true);
    expect(ADMIN_DOMAIN.decision).toBe(ADMIN_DOMAIN_DECISION);
  });

  it("lists Admin* events and Persian privilege warnings", () => {
    expect(ADMIN_DOMAIN_EVENTS).toContain("AdminActionRecorded");
    expect(ADMIN_DOMAIN_EVENTS).toContain("AdminMerchantActivated");
    expect(ADMIN_DOMAIN_EVENTS).toContain("AdminMerchantSuspended");
    expect(ADMIN_PRIVILEGE_WARNINGS_FA.platformOnly).toMatch(/مدیران پلتفرم/);
    expect(isAdminEnforcementAction("merchant.suspend")).toBe(true);
    expect(() => assertPlatformAdminAudience("platform_admin")).not.toThrow();
  });
});
