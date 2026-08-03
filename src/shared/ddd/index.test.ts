import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALE_DEFAULTS } from "../../product-architecture/index.js";
import {
  BOUNDED_CONTEXT_MODULES,
  DDD_STRATEGY,
  MODULE_LAYERS,
  assertPastTenseDomainEventName,
  createDomainEvent,
  createEventCollector,
  isPastTenseDomainEventName,
} from "./index.js";
import {
  formatTomanDisplay,
  moneyDisplayUnit,
  moneyFromMinor,
  phoneNumber,
  toToman,
} from "../domain/index.js";

describe("ADR-002 DDD strategy", () => {
  it("defines module folder layout and inward dependency rule", () => {
    expect(DDD_STRATEGY.pathPattern).toContain("src/modules/<context>");
    expect(DDD_STRATEGY.moduleLayers).toEqual([
      "domain",
      "application",
      "infrastructure",
    ]);
    expect(DDD_STRATEGY.repositoryInterfacesIn).toBe("domain");
    expect(DDD_STRATEGY.repositoryImplementationsIn).toBe("infrastructure");
    expect(DDD_STRATEGY.orm).toBe("drizzle");
    expect(DDD_STRATEGY.dependencyRule).toMatch(/inward/i);
  });

  it("forbids framework/ORM imports inside domain", () => {
    expect(DDD_STRATEGY.domainForbiddenImports).toEqual(
      expect.arrayContaining(["drizzle-orm", "next", "react", "mongodb"]),
    );
  });

  it("lists phase-1 bounded context modules", () => {
    expect(BOUNDED_CONTEXT_MODULES).toEqual(
      expect.arrayContaining(["pos", "crm", "loyalty", "ordering", "merchant"]),
    );
    expect(BOUNDED_CONTEXT_MODULES).not.toContain("delivery");
  });

  it("scaffolds module domain/application/infrastructure folders", () => {
    const root = join(process.cwd(), "src", "modules");
    for (const ctx of BOUNDED_CONTEXT_MODULES) {
      for (const layer of MODULE_LAYERS) {
        expect(existsSync(join(root, ctx, layer))).toBe(true);
      }
    }
  });

  it("requires past-tense domain event names", () => {
    expect(isPastTenseDomainEventName("SaleCompleted")).toBe(true);
    expect(isPastTenseDomainEventName("MerchantCreated")).toBe(true);
    expect(isPastTenseDomainEventName("CreateSale")).toBe(false);
    expect(() => assertPastTenseDomainEventName("UpdateInventory")).toThrow(
      /past tense/i,
    );
  });

  it("creates domain events and aggregate collectors", () => {
    const event = createDomainEvent({
      eventName: "StoreCreated",
      aggregateId: "store_1",
      aggregateType: "Store",
      payload: { merchantId: "m1" },
    });
    expect(event.eventName).toBe("StoreCreated");
    expect(event.payload.merchantId).toBe("m1");

    const collector = createEventCollector();
    collector.record(event);
    expect(collector.pullEvents()).toHaveLength(1);
    expect(collector.pullEvents()).toHaveLength(0);
  });

  it("models Money in IRR minor units with تومان display default", () => {
    const money = moneyFromMinor(100_000);
    expect(money.currency).toBe("IRR");
    expect(toToman(money)).toBe(10_000n);
    expect(moneyDisplayUnit()).toBe("toman");
    expect(moneyDisplayUnit()).toBe(LOCALE_DEFAULTS.moneyDisplayUnit);
    expect(formatTomanDisplay(money)).toMatch(/تومان/);
    expect(formatTomanDisplay(money)).toContain(
      Number(10_000n).toLocaleString("fa-IR"),
    );
    expect(() => moneyFromMinor(-1)).toThrow(/>= 0/);
  });

  it("requires valid Iranian PhoneNumber VO", () => {
    expect(phoneNumber("09123456789").value).toBe("09123456789");
    expect(phoneNumber("09123456789").e164).toBe("+989123456789");
    expect(() => phoneNumber("  ")).toThrow(/Iranian mobile/i);
    expect(() => phoneNumber("02188776655")).toThrow(/Iranian mobile/i);
  });
});
