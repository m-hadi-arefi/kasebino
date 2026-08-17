import { describe, expect, it } from "vitest";
import {
  createInMemoryIngestMetrics,
  createUnavailableMongoSink,
  createAnalyticsIngestBuffer,
  createIsolatingAnalyticsIngestPort,
} from "../../../../infrastructure/mongodb/contracts/ingest-isolation/index.js";
import { MONGO_COLLECTIONS } from "../../../../infrastructure/mongodb/contracts/analytics/index.js";
import {
  SESSION_ANALYTICS,
  SESSION_ANALYTICS_DECISION,
  SESSION_EVENT_TYPES,
  SESSION_IDLE,
  SESSION_METRIC_LABELS_FA,
  SESSION_PLACEMENT,
  SESSION_REQUIREMENTS,
  SESSION_TIMEZONE_NOTES,
  SESSION_UX_FA,
  applySessionAction,
  assertCollectionIsMosSessions,
  assertIdleTimeout30Minutes,
  assertIranTimezoneNotes,
  assertKnownMongoSessionCapability,
  assertPersianLabelPreserved,
  assertSessionAnalyticsImplementedHere,
  assertTrackNeverBlocksOltp,
  buildLifecycleEvent,
  classifyDeviceClass,
  createInMemorySessionMetrics,
  createSessionAnalyticsStack,
  createTrackSessionPort,
  deriveSessionDurationMs,
  eventTypeForAction,
  isDeviceClass,
  isIdleTimedOut,
  isSessionEventType,
  persianLabelForSessionMetric,
} from "./index.js";

describe("ADR-061 Session Analytics", () => {
  it("locks session aggregates to mos_sessions via trackSession", () => {
    expect(SESSION_ANALYTICS_DECISION.adr).toBe("ADR-061");
    expect(SESSION_ANALYTICS_DECISION.collection).toBe("mos_sessions");
    expect(SESSION_ANALYTICS_DECISION.relatedBehaviorCollection).toBe(
      MONGO_COLLECTIONS.behavior,
    );
    expect(SESSION_ANALYTICS_DECISION.sessionIdSource).toBe(
      "client_generated_uuid",
    );
    expect(SESSION_ANALYTICS_DECISION.idleTimeoutMinutes).toBe(30);
    expect(SESSION_ANALYTICS_DECISION.heartbeatExtendsIdleTtl).toBe(true);
    expect(SESSION_ANALYTICS_DECISION.deriveDuration).toBe(true);
    expect(SESSION_ANALYTICS_DECISION.onCheckoutCriticalPath).toBe(false);
    expect(SESSION_ANALYTICS_DECISION.ingestClass).toBe("best_effort_track");
    expect(SESSION_ANALYTICS_DECISION.ingestIsolationAdr).toBe("ADR-065");
    expect(SESSION_ANALYTICS_DECISION.identityStitchDeferred).toBe(true);
    expect(SESSION_PLACEMENT.package).toBe("src/modules/analytics/domain/session/");
    expect(SESSION_REQUIREMENTS.mosSessionsCollection).toBe(true);
    expect(SESSION_REQUIREMENTS.trackIsolatedVia065).toBe(true);
    expect(() => assertCollectionIsMosSessions("mos_sessions")).not.toThrow();
    expect(() => assertCollectionIsMosSessions("mos_behavior")).toThrow(
      /mos_sessions/i,
    );
    expect(() =>
      assertSessionAnalyticsImplementedHere("src/modules/analytics/domain/session/"),
    ).not.toThrow();
    expect(() => assertKnownMongoSessionCapability()).not.toThrow();
    expect(() => assertIdleTimeout30Minutes()).not.toThrow();
    expect(() => assertIranTimezoneNotes()).not.toThrow();
  });

  it("catalogs SessionStarted / SessionHeartbeat / SessionEnded", () => {
    expect(SESSION_EVENT_TYPES).toEqual([
      "SessionStarted",
      "SessionHeartbeat",
      "SessionEnded",
    ]);
    for (const t of SESSION_EVENT_TYPES) {
      expect(isSessionEventType(t)).toBe(true);
    }
    expect(eventTypeForAction("start")).toBe("SessionStarted");
    expect(eventTypeForAction("heartbeat")).toBe("SessionHeartbeat");
    expect(eventTypeForAction("end")).toBe("SessionEnded");
  });

  it("classifies device class (mobile / desktop / tablet)", () => {
    expect(classifyDeviceClass({ deviceClass: "mobile" })).toBe("mobile");
    expect(
      classifyDeviceClass({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
      }),
    ).toBe("mobile");
    expect(
      classifyDeviceClass({
        userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      }),
    ).toBe("tablet");
    expect(
      classifyDeviceClass({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      }),
    ).toBe("desktop");
    expect(classifyDeviceClass({ viewportWidth: 390 })).toBe("mobile");
    expect(classifyDeviceClass({ viewportWidth: 1280 })).toBe("desktop");
    expect(isDeviceClass("unknown")).toBe(true);
  });

  it("derives duration and enforces 30m idle timeout", () => {
    expect(SESSION_IDLE.timeoutMinutes).toBe(30);
    expect(SESSION_IDLE.timeoutMs).toBe(30 * 60 * 1000);
    const startedAt = "2026-08-03T10:00:00.000Z";
    const endedAt = "2026-08-03T10:12:30.000Z";
    expect(
      deriveSessionDurationMs({ startedAt, endedAt }),
    ).toBe(12.5 * 60 * 1000);
    expect(
      isIdleTimedOut(startedAt, "2026-08-03T10:29:59.000Z"),
    ).toBe(false);
    expect(
      isIdleTimedOut(startedAt, "2026-08-03T10:30:00.000Z"),
    ).toBe(true);

    const startEvent = buildLifecycleEvent({
      eventId: "e-start",
      sessionId: "sess-1",
      action: "start",
      merchantId: "m1",
      path: "/pos",
      deviceClass: "mobile",
      occurredAt: startedAt,
    });
    const { session: active } = applySessionAction({
      existing: null,
      event: startEvent,
    });
    expect(active.status).toBe("active");
    expect(active.durationMs).toBeNull();
    expect(active.entryPath).toBe("/pos");
    expect(active.deviceClass).toBe("mobile");

    const lateHeartbeat = buildLifecycleEvent({
      eventId: "e-hb-late",
      sessionId: "sess-1",
      action: "heartbeat",
      merchantId: "m1",
      occurredAt: "2026-08-03T10:31:00.000Z",
    });
    const { session: timedOut, timedOut: flag } = applySessionAction({
      existing: active,
      event: lateHeartbeat,
    });
    expect(flag).toBe(true);
    expect(timedOut.status).toBe("timed_out");
    expect(timedOut.durationMs).toBe(SESSION_IDLE.timeoutMs);
  });

  it("tracks start/heartbeat/end into mos_sessions with duration", async () => {
    const stack = createSessionAnalyticsStack();
    const start = stack.track.trackSession({
      eventId: "evt-1",
      sessionId: "client-uuid-1",
      action: "start",
      merchantId: "merchant-a",
      storeId: "store-1",
      path: "/storefront",
      deviceClass: "mobile",
      occurredAt: "2026-08-03T08:00:00.000Z",
    });
    expect(start.status).toBe("accepted");
    if (start.status !== "accepted") throw new Error("expected accepted");
    expect(start.sessionStatus).toBe("active");

    const hb = stack.track.trackSession({
      eventId: "evt-2",
      sessionId: "client-uuid-1",
      action: "heartbeat",
      merchantId: "merchant-a",
      storeId: "store-1",
      occurredAt: "2026-08-03T08:05:00.000Z",
    });
    expect(hb.status).toBe("accepted");

    const end = stack.track.trackSession({
      eventId: "evt-3",
      sessionId: "client-uuid-1",
      action: "end",
      merchantId: "merchant-a",
      storeId: "store-1",
      path: "/cart",
      occurredAt: "2026-08-03T08:10:00.000Z",
    });
    expect(end.status).toBe("accepted");
    if (end.status !== "accepted") throw new Error("expected accepted");
    expect(end.sessionStatus).toBe("ended");

    await stack.flush();
    const doc = await stack.store.findBySessionId("client-uuid-1");
    expect(doc).not.toBeNull();
    expect(doc?.merchantId).toBe("merchant-a");
    expect(doc?.storeId).toBe("store-1");
    expect(doc?.status).toBe("ended");
    expect(doc?.deviceClass).toBe("mobile");
    expect(doc?.entryPath).toBe("/storefront");
    expect(doc?.exitPath).toBe("/cart");
    expect(doc?.durationMs).toBe(10 * 60 * 1000);
    expect(doc?.eventCount).toBe(3);
    expect(await stack.store.findEventById("evt-1")).not.toBeNull();
  });

  it("treats same client sessionId as one session (multi-tab)", async () => {
    const stack = createSessionAnalyticsStack();
    stack.track.trackSession({
      eventId: "t1",
      sessionId: "shared-tab-id",
      action: "start",
      merchantId: "m1",
      path: "/a",
      deviceClass: "desktop",
      occurredAt: "2026-08-03T09:00:00.000Z",
    });
    stack.track.trackSession({
      eventId: "t2",
      sessionId: "shared-tab-id",
      action: "start",
      merchantId: "m1",
      path: "/b",
      deviceClass: "desktop",
      occurredAt: "2026-08-03T09:01:00.000Z",
    });
    await stack.flush();
    expect(await stack.store.count()).toBe(1);
    const doc = await stack.store.findBySessionId("shared-tab-id");
    expect(doc?.status).toBe("active");
    expect(doc?.entryPath).toBe("/a");
    expect(doc?.eventCount).toBe(2);
    expect(doc?.startedAt).toBe("2026-08-03T09:00:00.000Z");
  });

  it("new client UUID creates a separate session", async () => {
    const stack = createSessionAnalyticsStack();
    stack.track.trackSession({
      eventId: "n1",
      sessionId: "uuid-a",
      action: "start",
      merchantId: "m1",
      deviceClass: "mobile",
    });
    stack.track.trackSession({
      eventId: "n2",
      sessionId: "uuid-b",
      action: "start",
      merchantId: "m1",
      deviceClass: "mobile",
    });
    await stack.flush();
    expect(await stack.store.count()).toBe(2);
  });

  it("never throws when Mongo/sink is down (ADR-065 isolation)", async () => {
    const metrics = createInMemoryIngestMetrics();
    const buffer = createAnalyticsIngestBuffer({
      sink: createUnavailableMongoSink(),
      metrics,
      maxAttempts: 1,
    });
    const ingest = createIsolatingAnalyticsIngestPort(buffer, metrics);
    const track = createTrackSessionPort({
      ingest,
      metrics: createInMemorySessionMetrics(),
    });
    const result = track.trackSession({
      eventId: "down-1",
      sessionId: "sess-down",
      action: "start",
      merchantId: "m1",
      deviceClass: "mobile",
    });
    expect(result.status).toBe("accepted");
    const flush = await buffer.flush();
    expect(flush.dropped + flush.deadLetter).toBeGreaterThanOrEqual(1);
    expect(() => assertTrackNeverBlocksOltp(false)).not.toThrow();
    expect(() => assertTrackNeverBlocksOltp(true)).toThrow(/critical path/i);
  });

  it("rejects missing sessionId / merchantId without throwing from port", () => {
    const stack = createSessionAnalyticsStack();
    const missingSession = stack.track.trackSession({
      eventId: "bad-1",
      sessionId: "  ",
      action: "start",
      merchantId: "m1",
    });
    expect(missingSession.status).toBe("rejected");
    const missingMerchant = stack.track.trackSession({
      eventId: "bad-2",
      sessionId: "ok",
      action: "start",
      merchantId: "",
    });
    expect(missingMerchant.status).toBe("rejected");
  });

  it("scopes merchant queries and requires merchantId", async () => {
    const stack = createSessionAnalyticsStack();
    stack.track.trackSession({
      eventId: "q1",
      sessionId: "s1",
      action: "start",
      merchantId: "m-a",
      deviceClass: "tablet",
    });
    stack.track.trackSession({
      eventId: "q2",
      sessionId: "s2",
      action: "start",
      merchantId: "m-b",
      deviceClass: "tablet",
    });
    await stack.flush();
    const forA = await stack.store.findByMerchant({ merchantId: "m-a" });
    expect(forA).toHaveLength(1);
    expect(forA[0]?.sessionId).toBe("s1");
    await expect(
      stack.store.findByMerchant({ merchantId: "" }),
    ).rejects.toThrow(/merchantId/i);
  });

  it("provides Persian metric labels and Iran timezone notes", () => {
    expect(SESSION_METRIC_LABELS_FA.sessionsPerDay).toBe("نشست در روز");
    expect(SESSION_METRIC_LABELS_FA.averageDuration).toBe("میانگین مدت نشست");
    expect(persianLabelForSessionMetric("mobileShare")).toBe(
      "سهم دستگاه موبایل",
    );
    expect(SESSION_TIMEZONE_NOTES.timezone).toBe("Asia/Tehran");
    expect(SESSION_TIMEZONE_NOTES.calendar).toBe("jalali");
    expect(SESSION_TIMEZONE_NOTES.storage).toBe("utc_iso8601");
    expect(SESSION_TIMEZONE_NOTES.noteFa).toContain("تهران");
    expect(SESSION_UX_FA.dir).toBe("rtl");
    expect(SESSION_UX_FA.locale).toBe("fa-IR");
    expect(SESSION_UX_FA.TITLE).toContain("نشست");
    assertPersianLabelPreserved(
      SESSION_METRIC_LABELS_FA.activeSessions,
      "نشست‌های فعال",
    );
  });

  it("exports SESSION_ANALYTICS facade and requirements", () => {
    expect(SESSION_ANALYTICS.decision.collection).toBe("mos_sessions");
    expect(SESSION_ANALYTICS.idle.timeoutMinutes).toBe(30);
    expect(SESSION_ANALYTICS.api.session).toBe("/api/v1/analytics/session");
    expect(SESSION_ANALYTICS.requirements.httpSessionApiDeferredToArd027).toBe(
      true,
    );
    expect(SESSION_ANALYTICS.requirements.iranTimezoneNotes).toBe(true);
    expect(SESSION_ANALYTICS.timezoneNotes.merchantFacingBuckets).toBe(
      "jalali_asia_tehran_presentation",
    );
  });

  it("idempotent eventId on lifecycle ingest", async () => {
    const stack = createSessionAnalyticsStack();
    stack.track.trackSession({
      eventId: "dup-1",
      sessionId: "sess-dup",
      action: "start",
      merchantId: "m1",
      deviceClass: "mobile",
      occurredAt: "2026-08-03T11:00:00.000Z",
    });
    await stack.flush();
    // Re-enqueue same eventId via a second track with different id then manual duplicate insert path:
    const metrics = createInMemorySessionMetrics();
    const event = buildLifecycleEvent({
      eventId: "dup-1",
      sessionId: "sess-dup",
      action: "heartbeat",
      merchantId: "m1",
      occurredAt: "2026-08-03T11:01:00.000Z",
    });
    const existing = await stack.store.findBySessionId("sess-dup");
    const applied = applySessionAction({ existing, event });
    const result = await stack.store.upsertFromLifecycle(
      applied.session,
      event,
    );
    expect(result.status).toBe("duplicate_event");
    void metrics;
  });
});
