import { describe, expect, it } from "vitest";
import {
  createAnalyticsIngestBuffer,
  createInMemoryIngestMetrics,
  createIsolatingAnalyticsIngestPort,
  createUnavailableMongoSink,
  INGEST_METRIC_NAMES,
} from "../../../../infrastructure/mongodb/contracts/ingest-isolation/index.js";
import { MONGO_COLLECTIONS } from "../../../../infrastructure/mongodb/contracts/analytics/index.js";
import {
  FEATURE_KEYS,
  PRODUCT_ANALYTICS,
  PRODUCT_ANALYTICS_DECISION,
  PRODUCT_ANALYTICS_PLACEMENT,
  PRODUCT_ANALYTICS_REQUIREMENTS,
  PRODUCT_ANALYTICS_UX_FA,
  PRODUCT_EVENT_TYPES,
  PRODUCT_FEATURE_LABELS_FA,
  PRODUCT_FUNNELS,
  PRODUCT_METRIC_LABELS_FA,
  PRODUCT_PII_POLICY,
  assertCollectionIsMosProduct,
  assertDualReadMoneyFromPg,
  assertFunnelCoverage,
  assertKnownMongoProductCapability,
  assertNoSecretsInProperties,
  assertPersianPropertyPreserved,
  assertProductAnalyticsImplementedHere,
  assertTrackNeverBlocksOltp,
  buildProductAnalyticsDocument,
  createInMemoryProductAnalyticsMetrics,
  createProductAnalyticsStack,
  createTrackEventPort,
  hashIranianPhone,
  isFeatureKey,
  persianLabelForFeature,
  persianLabelForMetric,
  scrubProductProperties,
} from "./index.js";

describe("ADR-059 Product Analytics Architecture", () => {
  it("locks FeatureUsed + funnels to mos_product via trackEvent", () => {
    expect(PRODUCT_ANALYTICS_DECISION.adr).toBe("ADR-059");
    expect(PRODUCT_ANALYTICS_DECISION.collection).toBe(MONGO_COLLECTIONS.product);
    expect(PRODUCT_ANALYTICS_DECISION.collection).toBe("mos_product");
    expect(PRODUCT_ANALYTICS_DECISION.rollupsCollection).toBe(
      "mos_product_rollups",
    );
    expect(PRODUCT_ANALYTICS_DECISION.featureKeyRegistry).toBe(true);
    expect(PRODUCT_ANALYTICS_DECISION.dualReadMoneyFromPg).toBe(true);
    expect(PRODUCT_ANALYTICS_DECISION.onCheckoutCriticalPath).toBe(false);
    expect(PRODUCT_ANALYTICS_DECISION.ingestClass).toBe("best_effort_track");
    expect(PRODUCT_ANALYTICS_DECISION.ingestIsolationAdr).toBe("ADR-065");
    expect(PRODUCT_ANALYTICS_PLACEMENT.package).toBe("src/modules/analytics/domain/product/");
    expect(PRODUCT_ANALYTICS_REQUIREMENTS.trackEventIsolatedVia065).toBe(true);
    expect(() => assertCollectionIsMosProduct("mos_product")).not.toThrow();
    expect(() => assertCollectionIsMosProduct("mos_events")).toThrow(
      /mos_product/i,
    );
    expect(() =>
      assertProductAnalyticsImplementedHere("src/modules/analytics/domain/product/"),
    ).not.toThrow();
    expect(() => assertDualReadMoneyFromPg()).not.toThrow();
    expect(() => assertKnownMongoProductCapability()).not.toThrow();
  });

  it("registers POS / QR / pickup / loyalty feature keys with Persian labels", () => {
    expect(FEATURE_KEYS).toEqual(
      expect.arrayContaining([
        "pos.customer_capture",
        "qr.membership_join",
        "pickup.ready",
        "loyalty.redeem",
      ]),
    );
    for (const key of FEATURE_KEYS) {
      expect(isFeatureKey(key)).toBe(true);
      expect(PRODUCT_FEATURE_LABELS_FA[key].length).toBeGreaterThan(2);
      expect(persianLabelForFeature(key)).toBe(PRODUCT_FEATURE_LABELS_FA[key]);
    }
    expect(persianLabelForFeature("pos.customer_capture")).toContain("شماره");
    expect(PRODUCT_EVENT_TYPES).toContain("FeatureUsed");
    expect(PRODUCT_EVENT_TYPES).toContain("CustomerCaptureCompleted");
    expect(PRODUCT_EVENT_TYPES).toContain("StoreQrGenerated");
    expect(PRODUCT_EVENT_TYPES).toContain("OrderReadyForPickup");
    expect(PRODUCT_EVENT_TYPES).toContain("PointsRedeemed");
  });

  it("defines four 100% funnels with Persian labels", () => {
    const ids = Object.keys(PRODUCT_FUNNELS) as Array<
      keyof typeof PRODUCT_FUNNELS
    >;
    expect(() => assertFunnelCoverage(ids)).not.toThrow();

    expect(PRODUCT_FUNNELS.pos_phone_capture.labelFa).toContain("صندوق");
    expect(PRODUCT_FUNNELS.qr_acquisition.steps.map((s) => s.eventType)).toEqual(
      [
        "StoreQrGenerated",
        "StorefrontVisited",
        "MembershipCreated",
      ],
    );
    expect(PRODUCT_FUNNELS.pickup.steps.map((s) => s.eventType)).toEqual([
      "OrderCreated",
      "OrderReadyForPickup",
      "OrderCompleted",
    ]);
    expect(PRODUCT_FUNNELS.loyalty.steps.map((s) => s.eventType)).toEqual([
      "SaleCompleted",
      "PointsEarned",
      "LoyaltyRedeemClicked",
      "PointsRedeemed",
    ]);
    for (const funnel of Object.values(PRODUCT_FUNNELS)) {
      expect(funnel.sampleRate).toBe(1);
      expect(funnel.labelFa.length).toBeGreaterThan(2);
      for (const step of funnel.steps) {
        expect(isFeatureKey(step.featureKey)).toBe(true);
        expect(step.labelFa.length).toBeGreaterThan(1);
      }
    }
  });

  it("exposes Persian metric names for merchant UX later", () => {
    expect(persianLabelForMetric("posCaptureRate")).toContain("شماره");
    expect(persianLabelForMetric("qrJoinRate")).toContain("QR");
    expect(persianLabelForMetric("pickupCompletionRate")).toContain("پیکاپ");
    expect(persianLabelForMetric("loyaltyRedeemRate")).toContain("وفاداری");
    expect(PRODUCT_METRIC_LABELS_FA.featureAdoptionRate).toContain("پذیرش");
    expect(PRODUCT_ANALYTICS_UX_FA.dir).toBe("rtl");
    expect(PRODUCT_ANALYTICS_UX_FA.locale).toBe("fa-IR");
    expect(PRODUCT_ANALYTICS_UX_FA.ADMIN_FEATURES_TITLE).toContain("قابلیت");
    expect(PRODUCT_ANALYTICS_UX_FA.MONEY_DUAL_READ_HINT).toContain("عملیاتی");
  });

  it("trackEvent queues via ADR-065 and flushes into mos_product store", async () => {
    const stack = createProductAnalyticsStack();
    const accepted = stack.track.trackEvent({
      eventId: "pa-1",
      eventType: "FeatureUsed",
      featureKey: "pos.customer_capture",
      merchantId: "m-1",
      storeId: "s-1",
      funnelId: "pos_phone_capture",
      stepKey: "capture_completed",
      properties: { noteFa: "ثبت مشتری علی" },
    });
    expect(accepted).toMatchObject({
      status: "accepted",
      disposition: "queued",
      eventId: "pa-1",
    });
    expect(await stack.store.count()).toBe(0);

    const flushed = await stack.flush();
    expect(flushed.delivered).toBe(1);
    expect(await stack.store.count()).toBe(1);

    const found = await stack.store.findByEventId("pa-1");
    expect(found?.featureKey).toBe("pos.customer_capture");
    expect(found?.funnelId).toBe("pos_phone_capture");
    expect(found?.properties.noteFa).toBe("ثبت مشتری علی");
    expect(found?.properties.featureLabelFa).toBe(
      PRODUCT_FEATURE_LABELS_FA["pos.customer_capture"],
    );
    assertPersianPropertyPreserved(
      "ثبت مشتری علی",
      String(found?.properties.noteFa),
    );
  });

  it("never throws when Mongo sink is down (ADR-065 isolation)", async () => {
    const ingestMetrics = createInMemoryIngestMetrics();
    const buffer = createAnalyticsIngestBuffer({
      sink: createUnavailableMongoSink(),
      metrics: ingestMetrics,
      maxAttempts: 1,
    });
    const ingest = createIsolatingAnalyticsIngestPort(buffer, ingestMetrics);
    const track = createTrackEventPort({
      ingest,
      metrics: createInMemoryProductAnalyticsMetrics(),
    });

    const result = track.trackEvent({
      eventId: "pa-down",
      eventType: "AppOpened",
      merchantId: "m-1",
      featureKey: "app.opened",
    });
    expect(result.status).toBe("accepted");

    const flushed = await buffer.flush();
    expect(flushed.dropped + flushed.deadLetter).toBeGreaterThanOrEqual(1);
    expect(
      ingestMetrics.snapshot().mongoUnavailable +
        ingestMetrics.snapshot().dropped +
        ingestMetrics.snapshot().deadLetter,
    ).toBeGreaterThan(0);
    expect(INGEST_METRIC_NAMES.mongoUnavailable).toContain("mongo_unavailable");
    expect(() => assertTrackNeverBlocksOltp(false)).not.toThrow();
    expect(() => assertTrackNeverBlocksOltp(true)).toThrow(/critical path/i);
  });

  it("scrubs secrets and hashes Iranian phones while preserving Persian", () => {
    const { properties, scrubCount } = scrubProductProperties({
      otp: "123456",
      jwt: "eyJhbGciOiJIUzI1NiJ9.x.y",
      phone: "09121234567",
      noteFa: "مشتری ویژه تهران",
      nested: { mobile: "+989121234567", label: "برچسب فارسی" },
    });
    expect(scrubCount).toBeGreaterThanOrEqual(3);
    expect(properties.otp).toBeUndefined();
    expect(properties.jwt).toBeUndefined();
    expect(String(properties.phone)).toMatch(/^phone_hash:/);
    expect(properties.noteFa).toBe("مشتری ویژه تهران");
    expect(() => assertNoSecretsInProperties(properties)).not.toThrow();

    const doc = buildProductAnalyticsDocument({
      eventId: "pa-pii",
      eventType: "CustomerCaptureCompleted",
      merchantId: "m-1",
      featureKey: "pos.customer_capture",
      properties: {
        customerPhone: "09123456789",
        reasonFa: "عضویت از صندوق",
      },
    });
    expect(String(doc.properties.customerPhone)).toBe(
      `phone_hash:${hashIranianPhone("09123456789")}`,
    );
    expect(doc.properties.reasonFa).toBe("عضویت از صندوق");
    expect(JSON.stringify(doc.properties)).not.toMatch(/09123456789/);
    expect(PRODUCT_PII_POLICY.preferPhoneHash).toBe(true);
  });

  it("rejects FeatureUsed without featureKey without throwing to caller", () => {
    const stack = createProductAnalyticsStack();
    const result = stack.track.trackEvent({
      eventId: "pa-bad",
      eventType: "FeatureUsed",
      merchantId: "m-1",
    });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toMatch(/featureKey/i);
    }
  });

  it("enforces tenant filter on merchant queries", async () => {
    const stack = createProductAnalyticsStack();
    stack.track.trackEvent({
      eventId: "a1",
      eventType: "FeatureUsed",
      featureKey: "loyalty.redeem",
      merchantId: "m-a",
    });
    stack.track.trackEvent({
      eventId: "b1",
      eventType: "FeatureUsed",
      featureKey: "loyalty.redeem",
      merchantId: "m-b",
    });
    await stack.flush();

    const forA = await stack.store.findByMerchant({
      merchantId: "m-a",
      featureKey: "loyalty.redeem",
    });
    expect(forA.map((d) => d.eventId)).toEqual(["a1"]);

    await expect(
      stack.store.findByMerchant({ merchantId: "" }),
    ).rejects.toThrow(/merchantId/i);
  });

  it("exports aggregate PRODUCT_ANALYTICS contract", () => {
    expect(PRODUCT_ANALYTICS.decision.adr).toBe("ADR-059");
    expect(PRODUCT_ANALYTICS.api.track).toBe("/api/v1/analytics/track");
    expect(PRODUCT_ANALYTICS.api.adminFeatures).toBe(
      "/api/v1/admin/product-analytics/features",
    );
    expect(PRODUCT_ANALYTICS.cache.adminFeatureAdoptionTtlSecondsMin).toBe(60);
    expect(PRODUCT_ANALYTICS.funnels.pickup.id).toBe("pickup");
    expect(PRODUCT_ANALYTICS.requirements.funnelsPosQrPickupLoyalty).toBe(true);
  });
});
