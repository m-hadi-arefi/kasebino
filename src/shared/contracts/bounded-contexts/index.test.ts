import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOUNDED_CONTEXT_MODULES } from "../../ddd/index.js";
import {
  BOUNDED_CONTEXTS,
  CONTEXT_MAP,
  ORDERING_CONTEXT_POLICY,
  assertUiMayImportDomain,
  getContextById,
  isForbiddenUiDomainImport,
  moduleForContext,
} from "./index.js";

describe("ADR-003 bounded contexts", () => {
  it("includes every Decision context", () => {
    const ids = BOUNDED_CONTEXTS.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "identity_merchant",
        "identity_customer",
        "merchant",
        "store",
        "catalog",
        "inventory",
        "pos_sales",
        "crm_membership",
        "loyalty",
        "ordering_pickup",
        "payments",
        "analytics_oltp",
        "analytics_platform",
        "notifications",
        "admin",
        "realtime",
      ]),
    );
    expect(ids).not.toContain("delivery");
  });

  it("separates merchant identity from customer identity", () => {
    expect(moduleForContext("identity_merchant")).toBe("identity");
    expect(moduleForContext("identity_customer")).toBe("customer-identity");
    expect(getContextById("identity_merchant").audience).toBe("merchant");
    expect(getContextById("identity_customer").audience).toBe("customer");
  });

  it("splits analytics OLTP vs Mongo platform planes", () => {
    expect(getContextById("analytics_oltp").plane).toBe("postgresql_oltp");
    expect(getContextById("analytics_platform").plane).toBe("mongodb_analytics");
    expect(moduleForContext("analytics_oltp")).toBe("analytics");
    expect(moduleForContext("analytics_platform")).toBe("analytics");
  });

  it("locks ordering to pickup-only", () => {
    expect(ORDERING_CONTEXT_POLICY.fulfillmentMode).toBe("pickup");
    expect(ORDERING_CONTEXT_POLICY.forbiddenFulfillmentModes).toContain("delivery");
  });

  it("enforces storefront/admin ACL against POS domain", () => {
    expect(isForbiddenUiDomainImport("storefront", "pos")).toBe(true);
    expect(isForbiddenUiDomainImport("admin", "pos")).toBe(true);
    expect(() => assertUiMayImportDomain("storefront", "pos")).toThrow(/must not import/i);
    expect(() => assertUiMayImportDomain("storefront", "catalog")).not.toThrow();
  });

  it("maps contexts onto scaffolded module folders", () => {
    const root = join(process.cwd(), "src", "modules");
    const modules = new Set(BOUNDED_CONTEXTS.map((c) => c.module));
    for (const mod of modules) {
      expect(BOUNDED_CONTEXT_MODULES).toContain(mod);
      expect(existsSync(join(root, mod, "domain"))).toBe(true);
      expect(existsSync(join(root, mod, "application"))).toBe(true);
      expect(existsSync(join(root, mod, "infrastructure"))).toBe(true);
    }
  });

  it("publishes language via domain events and keeps support modules listed", () => {
    expect(CONTEXT_MAP.publishedLanguage).toBe("domain_events");
    expect(CONTEXT_MAP.supportModules).toEqual(
      expect.arrayContaining(["audit", "platform"]),
    );
    expect(CONTEXT_MAP.integrations.length).toBeGreaterThan(0);
  });
});
