import { describe, expect, it } from "vitest";
import {
  DEPRECATED_MVP_EVENTS,
  EVENT_NAMING,
  EVENT_NAMING_DECISION,
  EVENT_NAMING_RULES,
  EVENT_NAMING_UX_FA,
  EVENT_PAYLOAD_VERSIONING,
  EVENT_SCHEMA_REGISTRY,
  IMPLEMENTED_DOMAIN_EVENT_TYPES,
  MVP_EVENT_CATALOG,
  MVP_EVENT_TYPES,
  assertBreakingChangeBumpsVersion,
  assertCatalogDocUpdatedWithChange,
  assertEventInMvpCatalog,
  assertPayloadVersion,
  assertValidEventTypeName,
  findCatalogEntry,
  hasForbiddenCommandPrefix,
  isValidEventTypeName,
  nextPayloadVersion,
} from "./index.js";

describe("ADR-037 Event Naming and Schema Governance", () => {
  it("decides past-tense PascalCase, versioned payloads, and authoritative catalog", () => {
    expect(EVENT_NAMING_DECISION.pastTensePascalCase).toBe(true);
    expect(EVENT_NAMING_DECISION.versionedPayloads).toBe(true);
    expect(EVENT_NAMING_DECISION.payloadVersionField).toBe("payloadVersion");
    expect(EVENT_NAMING_DECISION.catalogAuthoritative).toBe(true);
    expect(EVENT_NAMING_DECISION.storeFirstAddendumAuthoritative).toBe(true);
    expect(EVENT_NAMING_DECISION.changesRequireDocUpdateSamePr).toBe(true);
    expect(EVENT_NAMING_DECISION.fullSchemaRegistryMvp).toBe(false);
    expect(EVENT_NAMING.decision).toBe(EVENT_NAMING_DECISION);
    expect(EVENT_NAMING_RULES.caseStyle).toBe("PascalCase");
    expect(EVENT_NAMING_RULES.tense).toBe("past");
  });

  it("accepts past-tense PascalCase and forbids CreateX command names", () => {
    for (const name of EVENT_NAMING_RULES.examplesValid) {
      expect(isValidEventTypeName(name)).toBe(true);
      expect(() => assertValidEventTypeName(name)).not.toThrow();
    }

    expect(isValidEventTypeName("CreateSale")).toBe(false);
    expect(hasForbiddenCommandPrefix("CreateSale")).toBe(true);
    expect(() => assertValidEventTypeName("CreateSale")).toThrow(/CreateX/i);

    expect(isValidEventTypeName("UpdateInventory")).toBe(false);
    expect(() => assertValidEventTypeName("UpdateInventory")).toThrow(
      /CreateX|past tense/i,
    );

    expect(isValidEventTypeName("DeleteProduct")).toBe(false);
    expect(isValidEventTypeName("createSale")).toBe(false);
    expect(isValidEventTypeName("sale-completed")).toBe(false);
    expect(isValidEventTypeName("")).toBe(false);

    expect(isValidEventTypeName("OrderReadyForPickup")).toBe(true);
    expect(isValidEventTypeName("OrderPreparing")).toBe(true);
    expect(isValidEventTypeName("OrderPickedUp")).toBe(true);
    expect(isValidEventTypeName("CampaignSent")).toBe(true);
    expect(isValidEventTypeName("StorePwaInstallPromptShown")).toBe(true);
  });

  it("requires payloadVersion ≥ 1 and bumps on breaking changes", () => {
    expect(EVENT_PAYLOAD_VERSIONING.field).toBe("payloadVersion");
    expect(EVENT_PAYLOAD_VERSIONING.minVersion).toBe(1);
    expect(EVENT_PAYLOAD_VERSIONING.incrementOnBreakingChange).toBe(true);
    expect(EVENT_PAYLOAD_VERSIONING.consumersTolerateUnknownFields).toBe(true);
    expect(EVENT_PAYLOAD_VERSIONING.silentBreakingChangeForbidden).toBe(true);

    expect(() => assertPayloadVersion(1)).not.toThrow();
    expect(() => assertPayloadVersion(0)).toThrow(/payloadVersion/i);
    expect(() => assertPayloadVersion(1.5)).toThrow(/payloadVersion/i);

    expect(nextPayloadVersion(1)).toBe(2);
    expect(() =>
      assertBreakingChangeBumpsVersion({
        breakingChange: true,
        previousVersion: 1,
        nextVersion: 2,
      }),
    ).not.toThrow();
    expect(() =>
      assertBreakingChangeBumpsVersion({
        breakingChange: true,
        previousVersion: 1,
        nextVersion: 1,
      }),
    ).toThrow(/increment/i);
    expect(() =>
      assertBreakingChangeBumpsVersion({
        breakingChange: false,
        previousVersion: 1,
        nextVersion: 1,
      }),
    ).not.toThrow();
  });

  it("encodes a light in-repo schema registry (no external registry MVP)", () => {
    expect(EVENT_SCHEMA_REGISTRY.mode).toBe("in_repo_catalog_light");
    expect(EVENT_SCHEMA_REGISTRY.externalRegistryForbiddenMvp).toBe(true);
    expect(EVENT_SCHEMA_REGISTRY.requireCatalogEntryForNewEvent).toBe(true);
    expect(EVENT_SCHEMA_REGISTRY.requireDocUpdateSamePr).toBe(true);
    expect(EVENT_SCHEMA_REGISTRY.requirePayloadVersion).toBe(true);
    expect(EVENT_SCHEMA_REGISTRY.ciDocstringCheck).toBe("optional_later");
    expect(EVENT_SCHEMA_REGISTRY.authoritativeSources).toContain(
      "docs/architecture/event-catalog.md",
    );
    expect(EVENT_SCHEMA_REGISTRY.authoritativeSources).toContain(
      "docs/architecture/event-catalog-store-first-addendum.md",
    );

    expect(() => assertCatalogDocUpdatedWithChange(true)).not.toThrow();
    expect(() => assertCatalogDocUpdatedWithChange(false)).toThrow(
      /same PR/i,
    );
  });

  it("catalogs known MVP events from domains and store-first addendum", () => {
    for (const eventType of [
      "MerchantCreated",
      "StoreCreated",
      "ProductCreated",
      "StockAdjusted",
      "InventoryChanged",
      "InventoryLowDetected",
      "InventoryDepleted",
      "MembershipCreated",
      "MembershipUpdated",
      "SaleCompleted",
      "PointsEarned",
      "MerchantLoggedIn",
      "OrderCreated",
      "OrderPaid",
      "OrderCanceled",
      "OrderPreparing",
      "OrderReadyForPickup",
      "OrderPickedUp",
      "OrderCompleted",
      "OrderRefunded",
      "PaymentIntentCreated",
      "PaymentSucceeded",
      "PaymentFailed",
      "PaymentRefunded",
    ]) {
      expect(IMPLEMENTED_DOMAIN_EVENT_TYPES).toContain(eventType);
      expect(MVP_EVENT_TYPES).toContain(eventType);
      expect(() => assertEventInMvpCatalog(eventType)).not.toThrow();
    }

    for (const eventType of [
      "StoreQrGenerated",
      "StoreBrandingUpdated",
      "CustomerLoggedIn",
    ]) {
      expect(MVP_EVENT_TYPES).toContain(eventType);
      const entry = findCatalogEntry(eventType);
      expect(entry?.source).toBe("store_first_addendum");
      expect(entry?.outOfMvp).toBeFalsy();
    }

    expect(MVP_EVENT_CATALOG.every((e) => e.payloadVersion >= 1)).toBe(true);
    expect(
      MVP_EVENT_CATALOG.filter((e) => e.implemented).every((e) =>
        isValidEventTypeName(e.eventType),
      ),
    ).toBe(true);
  });

  it("marks OrderDelivered out of MVP (delivery non-goal)", () => {
    expect(DEPRECATED_MVP_EVENTS.OrderDelivered.doNotImplementSubscribers).toBe(
      true,
    );
    expect(DEPRECATED_MVP_EVENTS.OrderDelivered.reason).toBe(
      "delivery_non_goal",
    );
    expect(MVP_EVENT_TYPES).not.toContain("OrderDelivered");
    expect(() => assertEventInMvpCatalog("OrderDelivered")).toThrow(
      /out of MVP/i,
    );
    expect(() => assertEventInMvpCatalog("WidgetActivated")).toThrow(
      /not in the MVP catalog/i,
    );
  });

  it("keeps wire schemas English and user-visible copy Persian + RTL", () => {
    expect(EVENT_NAMING_UX_FA.wireSchemasEnglishOk).toBe(true);
    expect(EVENT_NAMING_UX_FA.userVisibleToastsPersian).toBe(true);
    expect(EVENT_NAMING_UX_FA.notificationDrawersRtl).toBe(true);
    expect(EVENT_NAMING_UX_FA.dir).toBe("rtl");
    expect(EVENT_NAMING_UX_FA.locale).toBe("fa-IR");
    expect(EVENT_NAMING_UX_FA.SALE_COMPLETED_TOAST).toMatch(/[\u0600-\u06FF]/);
    expect(EVENT_NAMING_UX_FA.PICKUP_READY_TOAST).toMatch(/[\u0600-\u06FF]/);
    expect(EVENT_NAMING_UX_FA.NOTIFICATION_DRAWER_TITLE).toMatch(
      /[\u0600-\u06FF]/,
    );
  });
});
