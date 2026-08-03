import { describe, expect, it, vi } from "vitest";

import {
  createErrorEnvelope,
  createSuccessEnvelope,
} from "../api-standards/index.js";
import {
  buildScopedQueryKey,
  createMerchantQueryClient,
} from "../data-fetching/index.js";
import {
  buildMerchantTopic,
  InMemoryMqttBroker,
  mintMqttClientCredentials,
} from "../emqx-realtime/index.js";
import {
  assertMqttPreferredOverCustomWs,
  assertPersianRealtimeClientCopy,
  assertPollFallbackEnabled,
  buildMqttJsConnectOptions,
  CHANNEL_QUERY_ENTITIES,
  computeReconnectDelayMs,
  createInMemoryRealtimeTransport,
  createRealtimeClient,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_RECONNECT_BACKOFF,
  extractMerchantChannelFromTopic,
  handleRealtimeTokenRequest,
  invalidateQueriesForChannel,
  REALTIME_CLIENT,
  REALTIME_CLIENT_DECISION,
  REALTIME_CLIENT_METRICS,
  REALTIME_CLIENT_UX_FA,
  REALTIME_TOKEN_API,
  resolveRealtimeUxMessage,
  toMqttWebSocketUrl,
} from "./index.js";

describe("ADR-039 Realtime Client Strategy MQTT with Poll Fallback", () => {
  it("locks MQTT-over-WebSocket preferred with poll fallback + Query invalidation", () => {
    expect(REALTIME_CLIENT_DECISION.pattern).toBe(
      "mqtt_over_websocket_with_poll_fallback",
    );
    expect(REALTIME_CLIENT_DECISION.transportPreferred).toBe(
      "mqtt_over_websocket",
    );
    expect(REALTIME_CLIENT_DECISION.invalidateTanStackQuery).toBe(true);
    expect(REALTIME_CLIENT_DECISION.pollFallbackOnDisconnect).toBe(true);
    expect(REALTIME_CLIENT_DECISION.reconnectBackoff).toBe(true);
    expect(REALTIME_CLIENT_DECISION.customAppWebsocketStackForbidden).toBe(
      true,
    );
    expect(REALTIME_CLIENT_DECISION.shortLivedTokenApi).toBe(
      "/api/v1/realtime/token",
    );
    expect(REALTIME_TOKEN_API.path).toBe("/api/v1/realtime/token");
    expect(REALTIME_TOKEN_API.method).toBe("POST");
    expect(DEFAULT_POLL_INTERVAL_MS).toBe(15_000);
    expect(DEFAULT_RECONNECT_BACKOFF.maxDelayMs).toBe(30_000);
    expect(CHANNEL_QUERY_ENTITIES.sales).toContain("sales");
    expect(REALTIME_CLIENT.metrics.disconnect).toBe(
      REALTIME_CLIENT_METRICS.disconnect,
    );

    expect(() => assertMqttPreferredOverCustomWs(false)).not.toThrow();
    expect(() => assertMqttPreferredOverCustomWs(true)).toThrow(/MQTT/i);
    expect(() => assertPollFallbackEnabled(true)).not.toThrow();
    expect(() => assertPollFallbackEnabled(false)).toThrow(/Poll fallback/i);
  });

  it("derives MQTT WebSocket URLs for browsers", () => {
    expect(toMqttWebSocketUrl("mqtt://localhost:1883")).toBe(
      "ws://localhost:8083/mqtt",
    );
    expect(toMqttWebSocketUrl("ws://broker.example:8083")).toBe(
      "ws://broker.example:8083/mqtt",
    );
    expect(toMqttWebSocketUrl("wss://broker.example:8084/mqtt")).toBe(
      "wss://broker.example:8084/mqtt",
    );
    const opts = buildMqttJsConnectOptions({
      brokerUrl: "mqtt://emqx:1883",
      username: "u",
      password: "p",
      clientId: "c1",
    });
    expect(opts.protocol).toBe("mqtt_over_websocket");
    expect(opts.url).toBe("ws://emqx:8083/mqtt");
    expect(opts.clientId).toBe("c1");
  });

  it("mints realtime token via handler; unauthorized returns Persian 401", async () => {
    const ok = await handleRealtimeTokenRequest(
      { method: "POST", headers: { get: () => null } },
      {
        authorizer: {
          async resolveMerchantSession() {
            return { merchantId: "m-1" };
          },
        },
        env: "local",
        brokerUrlHint: "mqtt://localhost:1883",
      },
    );
    expect(ok.status).toBe(200);
    if (ok.status !== 200) throw new Error("expected 200");
    expect(ok.body.data.merchantId).toBe("m-1");
    expect(ok.body.data.brokerUrl).toBe("ws://localhost:8083/mqtt");
    expect(ok.body.data.subscribeAcl[0]).toContain("merchant/m-1/");
    expect(ok.body.data.username.length).toBeGreaterThan(0);
    expect(ok.body.data.password.length).toBeGreaterThan(0);

    const denied = await handleRealtimeTokenRequest(
      { method: "POST", headers: { get: () => "corr-1" } },
      {
        authorizer: {
          async resolveMerchantSession() {
            return null;
          },
        },
        env: "local",
        brokerUrlHint: "mqtt://localhost:1883",
      },
    );
    expect(denied.status).toBe(401);
    if (denied.status !== 401) throw new Error("expected 401");
    expect(denied.body.error.code).toBe("UNAUTHORIZED");
    expect(denied.body.error.message).toMatch(/[\u0600-\u06FF]/);
    expect(denied.body.error.correlationId).toBe("corr-1");

    // envelope helpers stay aligned with ADR-030
    expect(createSuccessEnvelope({ ok: true }).data.ok).toBe(true);
    expect(createErrorEnvelope({ code: "UNAUTHORIZED" }).error.message).toMatch(
      /[\u0600-\u06FF]/,
    );
  });

  it("invalidates TanStack Query when MQTT sales message arrives", async () => {
    const broker = new InMemoryMqttBroker();
    const transport = createInMemoryRealtimeTransport(broker);
    const queryClient = createMerchantQueryClient();
    const scope = { merchantId: "m-sales" };
    const salesKey = buildScopedQueryKey(scope, "sales");
    queryClient.setQueryData(salesKey, [{ id: "old" }]);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const client = createRealtimeClient({
      transport,
      queryClient,
      scope,
      env: "local",
      fetchToken: async () => {
        const creds = mintMqttClientCredentials({
          merchantId: "m-sales",
          env: "local",
          brokerUrlHint: "mqtt://localhost:1883",
        });
        return {
          username: creds.username,
          password: creds.password,
          expiresAt: creds.expiresAt.toISOString(),
          merchantId: creds.merchantId,
          subscribeAcl: creds.subscribeAcl,
          brokerUrl: toMqttWebSocketUrl("mqtt://localhost:1883"),
        };
      },
      schedule: () => ({ clear: () => undefined }),
    });

    await client.start();
    expect(client.getState()).toBe("connected");

    const topic = buildMerchantTopic({
      env: "local",
      merchantId: "m-sales",
      channel: "sales",
    });
    await broker.publish({
      topic,
      payload: JSON.stringify({ eventType: "SaleCompleted", eventId: "e1" }),
      qos: 1,
    });

    // allow async handler
    await vi.waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const calls = invalidateSpy.mock.calls.map((c) => c[0]);
    expect(
      calls.some(
        (arg) =>
          arg !== undefined &&
          JSON.stringify(arg.queryKey) === JSON.stringify(salesKey),
      ),
    ).toBe(true);

    expect(extractMerchantChannelFromTopic(topic)).toBe("sales");
    await invalidateQueriesForChannel(queryClient, scope, "orders");

    await client.stop();
    expect(client.getState()).toBe("stopped");
  });

  it("enters poll fallback on disconnect and grows reconnect backoff", async () => {
    const broker = new InMemoryMqttBroker();
    const transport = createInMemoryRealtimeTransport(broker);
    const queryClient = createMerchantQueryClient();
    const scope = { merchantId: "m-poll" };
    const scheduled: Array<{ delay: number; run: () => void }> = [];

    const client = createRealtimeClient({
      transport,
      queryClient,
      scope,
      env: "local",
      pollIntervalMs: 100,
      backoff: {
        initialDelayMs: 100,
        maxDelayMs: 800,
        multiplier: 2,
        fullJitter: false,
      },
      random: () => 1,
      fetchToken: async () => {
        const creds = mintMqttClientCredentials({
          merchantId: "m-poll",
          env: "local",
          brokerUrlHint: "ws://localhost:8083/mqtt",
        });
        return {
          username: creds.username,
          password: creds.password,
          expiresAt: creds.expiresAt.toISOString(),
          merchantId: creds.merchantId,
          subscribeAcl: creds.subscribeAcl,
          brokerUrl: "ws://localhost:8083/mqtt",
        };
      },
      schedule: (fn, delayMs) => {
        const entry = { delay: delayMs, run: fn };
        scheduled.push(entry);
        return {
          clear: () => {
            const idx = scheduled.indexOf(entry);
            if (idx >= 0) scheduled.splice(idx, 1);
          },
        };
      },
    });

    await client.start();
    expect(client.getState()).toBe("connected");
    expect(resolveRealtimeUxMessage(client.getUxKey())).toBe(
      REALTIME_CLIENT_UX_FA.CONNECTED,
    );

    transport.simulateUnexpectedDisconnect();
    expect(client.getState()).toBe("poll_fallback");
    expect(client.getUxKey()).toBe("reconnecting");
    expect(resolveRealtimeUxMessage("offline")).toMatch(/[\u0600-\u06FF]/);
    expect(resolveRealtimeUxMessage("poll_fallback")).toBe(
      REALTIME_CLIENT_UX_FA.POLL_FALLBACK,
    );
    expect(resolveRealtimeUxMessage("reconnecting")).toBe(
      REALTIME_CLIENT_UX_FA.RECONNECTING,
    );

    const pollDelays = scheduled.filter((s) => s.delay === 100);
    expect(pollDelays.length).toBeGreaterThanOrEqual(1);

    const reconnectDelays = scheduled
      .map((s) => s.delay)
      .filter((d) => d === 100 || d === 200 || d === 400 || d === 800);
    expect(reconnectDelays.length).toBeGreaterThanOrEqual(1);

    // backoff helper unit
    expect(computeReconnectDelayMs(0, {
      initialDelayMs: 100,
      maxDelayMs: 800,
      multiplier: 2,
      fullJitter: false,
    })).toBe(100);
    expect(computeReconnectDelayMs(3, {
      initialDelayMs: 100,
      maxDelayMs: 800,
      multiplier: 2,
      fullJitter: false,
    })).toBe(800);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    await client.runPollCycle();
    expect(invalidateSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

    await client.stop();
  });

  it("ships Persian RTL reconnect toast copy", () => {
    expect(REALTIME_CLIENT_UX_FA.dir).toBe("rtl");
    expect(REALTIME_CLIENT_UX_FA.locale).toBe("fa-IR");
    expect(REALTIME_CLIENT_UX_FA.CONNECTED).toMatch(/[\u0600-\u06FF]/);
    expect(REALTIME_CLIENT_UX_FA.POLL_FALLBACK).toMatch(/[\u0600-\u06FF]/);
    expect(REALTIME_CLIENT_UX_FA.RECONNECTING).toMatch(/[\u0600-\u06FF]/);
    expect(REALTIME_CLIENT_UX_FA.OFFLINE).toMatch(/[\u0600-\u06FF]/);
    expect(() => assertPersianRealtimeClientCopy()).not.toThrow();
  });
});
