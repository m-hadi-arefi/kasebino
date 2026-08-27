import { describe, expect, it } from "vitest";

import {
  ADMIN_DOMAIN_DECISION,
  ADMIN_DOMAIN_EVENTS,
  ADMIN_PRIVILEGE_WARNINGS_FA,
  ADMIN_ACTION_LABELS_FA,
  adminActionLabelFa,
  assertPlatformAdminAudience,
} from "./domain/contracts/index.js";
import { adminActions, adminUsers } from "../../infrastructure/database/schema/index.js";
import {
  ADMIN_ERROR_MESSAGES_FA,
  InMemoryAdminActionRepository,
  InMemoryAdminUserRepository,
  createAdminAuditPortStub,
  createAdminUseCases,
  createAdminUser,
  createRecordingSecurityMonitoringPort,
} from "./index.js";
import {
  InMemoryMerchantRepository,
  createMerchantUseCases,
} from "../merchant/index.js";
import type { AuthContext } from "../../infrastructure/security/rbac/index.js";

function platformAuth(sub: string): AuthContext {
  return {
    sub,
    merchantId: null,
    roles: ["platform_admin"],
  };
}

function merchantOwnerAuth(sub: string, merchantId: string): AuthContext {
  return {
    sub,
    merchantId,
    roles: ["merchant_owner"],
  };
}

let merchantSeed = 0;

async function seedMerchant(
  merchants: InMemoryMerchantRepository,
  opts?: { activate?: boolean; tradeName?: string },
) {
  merchantSeed += 1;
  const merchantUseCases = createMerchantUseCases({
    merchants,
    idFactory: (() => {
      let n = 0;
      return () => `m-${merchantSeed}-${++n}`;
    })(),
    now: (() => {
      let t = 1_700_000_000_000 + merchantSeed * 1000;
      return () => new Date(t++);
    })(),
  });
  const created = await merchantUseCases.createMerchant({
    tradeName: opts?.tradeName ?? "قصابی رضایی",
    slug: `rezaei-meat-${merchantSeed}`,
    ownerUserId: `owner-${merchantSeed}`,
  });
  if (opts?.activate) {
    await merchantUseCases.activateMerchant({
      merchantId: created.merchant.id,
    });
  }
  return created.merchant;
}

function createHarness() {
  const adminUsersRepo = new InMemoryAdminUserRepository();
  const adminActionsRepo = new InMemoryAdminActionRepository();
  const merchants = new InMemoryMerchantRepository();
  const auditStub = createAdminAuditPortStub();
  const security = createRecordingSecurityMonitoringPort();
  let n = 0;
  const useCases = createAdminUseCases({
    adminUsers: adminUsersRepo,
    adminActions: adminActionsRepo,
    merchants,
    audit: auditStub.port,
    securityMonitoring: security,
    idFactory: () => `a-${++n}`,
    now: (() => {
      let t = 1_710_000_000_000;
      return () => new Date(t++);
    })(),
  });

  const admin = createAdminUser({
    id: "admin-1",
    login: "ops@kasbino.ir",
    displayName: "مدیر پلتفرم",
  });

  return {
    adminUsersRepo,
    adminActionsRepo,
    merchants,
    auditStub,
    security,
    useCases,
    admin,
    async seedAdmin() {
      await adminUsersRepo.save(admin);
      return admin;
    },
  };
}

describe("ADR-013 Admin Domain", () => {
  it("contract: platform_admin, enforcement, Persian privilege warnings", () => {
    expect(ADMIN_DOMAIN_DECISION.audience).toBe("platform_admin");
    expect(ADMIN_DOMAIN_DECISION.auditEveryAction).toBe(true);
    expect(ADMIN_DOMAIN_DECISION.auditVia).toBe("AuditPort");
    expect(ADMIN_DOMAIN_DECISION.merchantApisMustNotImplyAdmin).toBe(true);
    expect(ADMIN_DOMAIN_EVENTS).toEqual([
      "AdminActionRecorded",
      "AdminMerchantActivated",
      "AdminMerchantSuspended",
    ]);
    expect(ADMIN_PRIVILEGE_WARNINGS_FA.platformOnly).toMatch(/مدیران پلتفرم/);
    expect(adminActionLabelFa("merchant.suspend")).toBe(
      ADMIN_ACTION_LABELS_FA["merchant.suspend"],
    );
    expect(() => assertPlatformAdminAudience("platform_admin")).not.toThrow();
    expect(() => assertPlatformAdminAudience("merchant_owner")).toThrow(
      /platform_admin/,
    );
  });

  it("denies non-platform_admin with Persian message", async () => {
    const h = createHarness();
    await h.seedAdmin();
    const merchant = await seedMerchant(h.merchants, { activate: true });

    await expect(
      h.useCases.suspendMerchant({
        auth: merchantOwnerAuth("owner-1", merchant.id),
        merchantId: merchant.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN_NOT_PLATFORM_ADMIN",
      messageFa: ADMIN_ERROR_MESSAGES_FA.FORBIDDEN_NOT_PLATFORM_ADMIN,
    });
  });

  it("activates draft merchant, audits, and emits domain events", async () => {
    const h = createHarness();
    await h.seedAdmin();
    const merchant = await seedMerchant(h.merchants);

    const result = await h.useCases.activateMerchant({
      auth: platformAuth(h.admin.id),
      merchantId: merchant.id,
      correlationId: "corr-activate-1",
    });

    expect(result.merchant.status).toBe("active");
    expect(result.adminAction.action).toBe("merchant.activate");
    expect(result.adminAction.result).toBe("success");
    expect(result.events.map((e) => e.eventName)).toEqual([
      "AdminMerchantActivated",
      "MerchantActivated",
      "AdminActionRecorded",
    ]);
    expect(result.privilegeWarningFa).toMatch(/فعال‌سازی/);

    const audited = await h.auditStub.store.search({
      action: "merchant.activate",
      includePlatformScope: true,
    });
    expect(audited.length).toBeGreaterThanOrEqual(1);
    expect(audited[0]?.actorRole).toBe("platform_admin");
    expect(audited[0]?.merchantId).toBe(merchant.id);

    expect(h.security.signals).toHaveLength(1);
    expect(h.security.signals[0]?.type).toBe("AdminMerchantActivated");
  });

  it("suspends active merchant, audits, and hooks security monitoring", async () => {
    const h = createHarness();
    await h.seedAdmin();
    const merchant = await seedMerchant(h.merchants, { activate: true });

    const result = await h.useCases.suspendMerchant({
      auth: platformAuth(h.admin.id),
      merchantId: merchant.id,
      reason: "abuse",
      reasonFa: "سوءاستفاده مشکوک",
      correlationId: "corr-suspend-1",
    });

    expect(result.merchant.status).toBe("suspended");
    expect(result.adminAction.action).toBe("merchant.suspend");
    expect(result.events.map((e) => e.eventName)).toEqual([
      "AdminMerchantSuspended",
      "MerchantSuspended",
      "AdminActionRecorded",
    ]);
    expect(result.privilegeWarningFa).toMatch(/تعلیق/);

    const audited = await h.auditStub.store.search({
      action: "merchant.suspend",
      includePlatformScope: true,
    });
    expect(audited.length).toBeGreaterThanOrEqual(1);
    expect(audited[0]?.action).toBe("merchant.suspend");

    expect(h.security.signals[0]?.type).toBe("AdminMerchantSuspended");

    const actions = await h.adminActionsRepo.listByMerchant(merchant.id);
    expect(actions[0]?.reasonFa).toBe("سوءاستفاده مشکوک");
  });

  it("reactivates suspended merchant via admin activate", async () => {
    const h = createHarness();
    await h.seedAdmin();
    const merchant = await seedMerchant(h.merchants, { activate: true });
    await h.useCases.suspendMerchant({
      auth: platformAuth(h.admin.id),
      merchantId: merchant.id,
    });

    const result = await h.useCases.activateMerchant({
      auth: platformAuth(h.admin.id),
      merchantId: merchant.id,
    });

    expect(result.merchant.status).toBe("active");
    expect(result.adminAction.beforeStatus).toBe("suspended");
    expect(result.adminAction.afterStatus).toBe("active");
  });

  it("rejects invalid suspend/activate with Persian messages", async () => {
    const h = createHarness();
    await h.seedAdmin();
    const draft = await seedMerchant(h.merchants);

    await expect(
      h.useCases.suspendMerchant({
        auth: platformAuth(h.admin.id),
        merchantId: draft.id,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_SUSPEND_TRANSITION",
      messageFa: ADMIN_ERROR_MESSAGES_FA.INVALID_SUSPEND_TRANSITION,
    });

    const active = await seedMerchant(h.merchants, { activate: true });
    // Activate already-active
    await expect(
      h.useCases.activateMerchant({
        auth: platformAuth(h.admin.id),
        merchantId: active.id,
      }),
    ).rejects.toMatchObject({
      code: "ALREADY_ACTIVE",
      messageFa: ADMIN_ERROR_MESSAGES_FA.ALREADY_ACTIVE,
    });
  });

  it("lists and views merchants for platform_admin with audit", async () => {
    const h = createHarness();
    await h.seedAdmin();
    await seedMerchant(h.merchants, { activate: true });

    const listed = await h.useCases.listMerchants({
      auth: platformAuth(h.admin.id),
    });
    expect(listed.merchants).toHaveLength(1);
    expect(listed.privilegeWarningFa).toMatch(/مدیران پلتفرم/);
    expect(listed.adminAction.action).toBe("merchant.list");

    const viewed = await h.useCases.getMerchant({
      auth: platformAuth(h.admin.id),
      merchantId: listed.merchants[0]!.id,
    });
    expect(viewed.merchant.tradeName).toBe("قصابی رضایی");
    expect(viewed.adminAction.action).toBe("merchant.view");

    const platformAudits = await h.auditStub.store.search({
      action: "admin.platform_action",
      includePlatformScope: true,
    });
    expect(platformAudits.length).toBeGreaterThanOrEqual(2);
  });

  it("retrieves security overview and records security events (ADR-154)", async () => {
    const h = createHarness();
    await h.seedAdmin();

    await h.useCases.recordSecurityEvent({
      auth: platformAuth(h.admin.id),
      signal: {
        type: "auth_failure",
        severity: "warning",
        source: "auth_service",
        descriptionFa: "ورود ناموفق با رمز عبور اشتباه",
        ip: "192.168.1.1",
      },
    });

    const overview = await h.useCases.getSecurityOverview({
      auth: platformAuth(h.admin.id),
    });

    expect(overview.summary.authFailures24h).toBe(1);
    expect(overview.signals.length).toBeGreaterThan(0);
    expect(overview.signals[0]?.descriptionFa).toBe("ورود ناموفق با رمز عبور اشتباه");
  });

  it("exports drizzle admin schema stubs", () => {
    expect(adminUsers).toBeDefined();
    expect(adminActions).toBeDefined();
  });
});
