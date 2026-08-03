import { describe, expect, it } from "vitest";
import {
  createAnalyticsIngestBuffer,
  createInMemoryIngestMetrics,
  createIsolatingAnalyticsIngestPort,
  createUnavailableMongoSink,
  INGEST_METRIC_NAMES,
} from "../analytics-ingest-isolation/index.js";
import { MONGO_COLLECTIONS } from "../mongodb-analytics/index.js";
import {
  CLICKSTREAM,
  CLICKSTREAM_DECISION,
  CLICKSTREAM_EVENT_TYPES,
  CLICKSTREAM_METRIC_LABELS_FA,
  CLICKSTREAM_PII_POLICY,
  CLICKSTREAM_PLACEMENT,
  CLICKSTREAM_REQUIREMENTS,
  CLICKSTREAM_SAMPLING,
  CLICKSTREAM_UX_FA,
  assertCollectionIsMosBehavior,
  assertClickstreamImplementedHere,
  assertKnownMongoBehaviorCapability,
  assertNoSecretsInProperties,
  assertPersianPropertyPreserved,
  assertPosAndFunnelFullFidelity,
  assertTrackNeverBlocksOltp,
  buildClickstreamDocument,
  classifyClickstreamEvent,
  createClickstreamStack,
  createInMemoryClickstreamMetrics,
  createTrackClickstreamPort,
  hashIranianPhone,
  isClickstreamEventType,
  persianLabelForMetric,
  scrubClickstreamProperties,
  shouldKeepSample,
} from "./index.js";

describe("ADR-060 User Behavior and Clickstream Tracking", () => {
  it("locks beacon clickstream to mos_behavior via trackClickstream", () => {
    expect(CLICKSTREAM_DECISION.adr).toBe("ADR-060");
    expect(CLICKSTREAM_DECISION.collection).toBe(MONGO_COLLECTIONS.behavior);
    expect(CLICKSTREAM_DECISION.collection).toBe("mos_behavior");
    expect(CLICKSTREAM_DECISION.colloquialCollectionAlias).toBe(
      "mos_clickstream",
    );
    expect(CLICKSTREAM_DECISION.storeScoped).toBe(true);
    expect(CLICKSTREAM_DECISION.sampleNoisy).toBe(true);
    expect(CLICKSTREAM_DECISION.funnelEventsSampleRate).toBe(1);
    expect(CLICKSTREAM_DECISION.posCriticalSampleRate).toBe(1);
    expect(CLICKSTREAM_DECISION.ttlDaysMin).toBe(90);
    expect(CLICKSTREAM_DECISION.ttlDaysMax).toBe(180);
    expect(CLICKSTREAM_DECISION.onCheckoutCriticalPath).toBe(false);
    expect(CLICKSTREAM_DECISION.ingestClass).toBe("best_effort_track");
    expect(CLICKSTREAM_DECISION.ingestIsolationAdr).toBe("ADR-065");
    expect(CLICKSTREAM_DECISION.sessionsAdr).toBe("ADR-061");
    expect(CLICKSTREAM_DECISION.sessionsImplementedIn).toBe(
      "src/session-analytics/",
    );
    expect(CLICKSTREAM_PLACEMENT.package).toBe("src/clickstream/");
    expect(CLICKSTREAM_REQUIREMENTS.trackIsolatedVia065).toBe(true);
    expect(() => assertCollectionIsMosBehavior("mos_behavior")).not.toThrow();
    expect(() => assertCollectionIsMosBehavior("mos_clickstream")).toThrow(
      /mos_behavior/i,
    );
    expect(() =>
      assertClickstreamImplementedHere("src/clickstream/"),
    ).not.toThrow();
    expect(() => assertKnownMongoBehaviorCapability()).not.toThrow();
    expect(() => assertPosAndFunnelFullFidelity()).not.toThrow();
  });

  it("catalogs PageViewed / ElementClicked / POS / storefront events", () => {
    expect(CLICKSTREAM_EVENT_TYPES).toEqual(
      expect.arrayContaining([
        "PageViewed",
        "ElementClicked",
        "ScrollDepth",
        "StorefrontViewed",
        "ProductDetailViewed",
        "PosScreenViewed",
        "PosElementClicked",
      ]),
    );
    for (const t of CLICKSTREAM_EVENT_TYPES) {
      expect(isClickstreamEventType(t)).toBe(true);
    }
    expect(classifyClickstreamEvent({ eventType: "PosScreenViewed" })).toBe(
      "pos_critical",
    );
    expect(
      classifyClickstreamEvent({
        eventType: "PageViewed",
        source: "merchant_pos",
      }),
    ).toBe("pos_critical");
    expect(
      classifyClickstreamEvent({ eventType: "StorefrontViewed" }),
    ).toBe("funnel_companion");
    expect(classifyClickstreamEvent({ eventType: "ScrollDepth" })).toBe(
      "noisy",
    );
    expect(classifyClickstreamEvent({ eventType: "PageViewed" })).toBe(
      "standard",
    );
  });

  it("keeps POS and funnel at 100% and samples noisy events", () => {
    expect(CLICKSTREAM_SAMPLING.posCriticalSampleRate).toBe(1);
    expect(CLICKSTREAM_SAMPLING.funnelCompanionSampleRate).toBe(1);
    expect(
      shouldKeepSample("pos_critical", { random: () => 0.99 }),
    ).toBe(true);
    expect(
      shouldKeepSample("funnel_companion", { random: () => 0.99 }),
    ).toBe(true);
    expect(
      shouldKeepSample("noisy", {
        noisySampleRate: 0.1,
        random: () => 0.5,
      }),
    ).toBe(false);
    expect(
      shouldKeepSample("noisy", {
        noisySampleRate: 0.1,
        random: () => 0.05,
      }),
    ).toBe(true);

    const stackDrop = createClickstreamStack({
      noisySampleRate: 0,
      random: () => 0,
    });
    const dropped = stackDrop.track.trackClickstream({
      eventId: "noise-1",
      eventType: "ScrollDepth",
      merchantId: "m-1",
      storeId: "s-1",
      path: "/s/demo",
    });
    expect(dropped.status).toBe("sampled_out");

    const keptPos = stackDrop.track.trackClickstream({
      eventId: "pos-1",
      eventType: "PosScreenViewed",
      merchantId: "m-1",
      storeId: "s-1",
      path: "/pos",
      source: "merchant_pos",
    });
    expect(keptPos.status).toBe("accepted");
  });

  it("exposes Persian metric names and RTL stubs", () => {
    expect(persianLabelForMetric("pageViews")).toContain("بازدید");
    expect(persianLabelForMetric("posScreenViews")).toContain("صندوق");
    expect(persianLabelForMetric("storefrontViews")).toContain("ویترین");
    expect(CLICKSTREAM_METRIC_LABELS_FA.elementClicks).toContain("کلیک");
    expect(CLICKSTREAM_UX_FA.dir).toBe("rtl");
    expect(CLICKSTREAM_UX_FA.locale).toBe("fa-IR");
    expect(CLICKSTREAM_UX_FA.PATHS_TITLE).toContain("مسیر");
    expect(CLICKSTREAM_UX_FA.SAMPLE_HINT).toContain("صندوق");
  });

  it("trackClickstream queues via ADR-065 and flushes into mos_behavior store", async () => {
    const stack = createClickstreamStack();
    const accepted = stack.track.trackClickstream({
      eventId: "cs-1",
      eventType: "PageViewed",
      merchantId: "m-1",
      storeId: "s-1",
      sessionId: "sess-1",
      path: "/s/demo/menu",
      referrer: "/s/demo",
      viewportClass: "mobile",
      properties: { labelFa: "منوی ویترین علی" },
    });
    expect(accepted).toMatchObject({
      status: "accepted",
      disposition: "queued",
      eventId: "cs-1",
    });
    expect(await stack.store.count()).toBe(0);

    const flushed = await stack.flush();
    expect(flushed.delivered).toBe(1);
    expect(await stack.store.count()).toBe(1);

    const found = await stack.store.findByEventId("cs-1");
    expect(found?.path).toBe("/s/demo/menu");
    expect(found?.viewportClass).toBe("mobile");
    expect(found?.properties.labelFa).toBe("منوی ویترین علی");
    assertPersianPropertyPreserved(
      "منوی ویترین علی",
      String(found?.properties.labelFa),
    );
  });

  it("ingests beacon batches and respects max batch size", async () => {
    const stack = createClickstreamStack();
    const batch = stack.track.ingestBeaconBatch([
      {
        eventId: "b1",
        eventType: "PageViewed",
        merchantId: "m-1",
        storeId: "s-1",
        path: "/a",
      },
      {
        eventId: "b2",
        eventType: "ElementClicked",
        merchantId: "m-1",
        storeId: "s-1",
        path: "/a",
        properties: { elementId: "cta-pickup" },
      },
      {
        eventId: "b3",
        eventType: "ProductDetailViewed",
        merchantId: "m-1",
        storeId: "s-1",
        path: "/a/p/1",
        funnelCritical: true,
      },
    ]);
    expect(batch.accepted).toBe(3);
    expect(batch.rejected).toBe(0);
    await stack.flush();
    expect(await stack.store.count()).toBe(3);
    expect(CLICKSTREAM.beacon.maxBatchSize).toBe(50);
    expect(CLICKSTREAM.api.beacon).toBe("/api/v1/analytics/beacon");
    expect(CLICKSTREAM.cors.lockedToAppOrigins).toBe(true);
  });

  it("never throws when Mongo sink is down (ADR-065 isolation)", async () => {
    const ingestMetrics = createInMemoryIngestMetrics();
    const buffer = createAnalyticsIngestBuffer({
      sink: createUnavailableMongoSink(),
      metrics: ingestMetrics,
      maxAttempts: 1,
    });
    const ingest = createIsolatingAnalyticsIngestPort(buffer, ingestMetrics);
    const track = createTrackClickstreamPort({
      ingest,
      metrics: createInMemoryClickstreamMetrics(),
    });

    const result = track.trackClickstream({
      eventId: "cs-down",
      eventType: "PageViewed",
      merchantId: "m-1",
      path: "/pos",
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
    const { properties, scrubCount } = scrubClickstreamProperties({
      otp: "123456",
      jwt: "eyJhbGciOiJIUzI1NiJ9.x.y",
      phone: "09121234567",
      noteFa: "مشتری ویژه کرمان",
      nested: { mobile: "+989121234567", label: "برچسب فارسی" },
    });
    expect(scrubCount).toBeGreaterThanOrEqual(3);
    expect(properties.otp).toBeUndefined();
    expect(properties.jwt).toBeUndefined();
    expect(String(properties.phone)).toMatch(/^phone_hash:/);
    expect(properties.noteFa).toBe("مشتری ویژه کرمان");
    expect(() => assertNoSecretsInProperties(properties)).not.toThrow();

    const doc = buildClickstreamDocument({
      eventId: "cs-pii",
      eventType: "ElementClicked",
      merchantId: "m-1",
      storeId: "s-1",
      path: "/pos",
      properties: {
        customerPhone: "09123456789",
        reasonFa: "کلیک ثبت شماره",
      },
    });
    expect(String(doc.properties.customerPhone)).toBe(
      `phone_hash:${hashIranianPhone("09123456789")}`,
    );
    expect(doc.properties.reasonFa).toBe("کلیک ثبت شماره");
    expect(JSON.stringify(doc.properties)).not.toMatch(/09123456789/);
    expect(CLICKSTREAM_PII_POLICY.preferPhoneHash).toBe(true);
  });

  it("rejects missing merchantId without throwing to caller", () => {
    const stack = createClickstreamStack();
    const result = stack.track.trackClickstream({
      eventId: "cs-bad",
      eventType: "PageViewed",
      merchantId: "",
      path: "/x",
    });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toMatch(/merchantId/i);
    }
  });

  it("enforces tenant filter on merchant queries", async () => {
    const stack = createClickstreamStack();
    stack.track.trackClickstream({
      eventId: "a1",
      eventType: "PageViewed",
      merchantId: "m-a",
      storeId: "s-a",
      path: "/a",
    });
    stack.track.trackClickstream({
      eventId: "b1",
      eventType: "PageViewed",
      merchantId: "m-b",
      storeId: "s-b",
      path: "/b",
    });
    await stack.flush();

    const forA = await stack.store.findByMerchant({
      merchantId: "m-a",
      eventType: "PageViewed",
    });
    expect(forA.map((d) => d.eventId)).toEqual(["a1"]);

    await expect(
      stack.store.findByMerchant({ merchantId: "" }),
    ).rejects.toThrow(/merchantId/i);
  });

  it("exports aggregate CLICKSTREAM contract", () => {
    expect(CLICKSTREAM.decision.adr).toBe("ADR-060");
    expect(CLICKSTREAM.api.beacon).toBe("/api/v1/analytics/beacon");
    expect(CLICKSTREAM.api.session).toBe("/api/v1/analytics/session");
    expect(CLICKSTREAM.requirements.sessionsImplementedAdr061).toBe(true);
    expect(CLICKSTREAM.sampling.noisyDefaultSampleRate).toBe(0.1);
    expect(CLICKSTREAM.placement.colloquialCollectionAlias).toBe(
      "mos_clickstream",
    );
  });
});
