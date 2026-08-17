import { describe, expect, it, vi } from "vitest";

import {
  createErrorEnvelope,
  createSuccessEnvelope,
} from "../../../shared/contracts/api-standards/index.js";
import {
  buildScopedQueryKey,
  createMerchantQueryClient,
} from "../../../shared/contracts/data-fetching/index.js";
import {
  buildMerchantTopic,
  InMemoryMqttBroker,
  mintMqttClientCredentials,
} from "../contracts/index.js";
import {
  assertMqttPreferredOverCustomWs,
  assertPersianRealtimeClientCopy,
  assertPollFallbackEnabled,
  buildMqttJsConnectOptions,
  CHANNEL_QUERY_ENTITIES,
  CHANNEL_UI_QUERY_PREFIXES,
  computeReconnectDelayMs,
  createInMemoryRealtimeTransport,
  createRealtimeClient,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_RECONNECT_BACKOFF,
  envelopeMatchesStoreScope,
  extractMerchantChannelFromTopic,
  handleRealtimeTokenRequest,
  invalidateQueriesForChannel,
  isMqttClientEnabled,
  REALTIME_CLIENT,
  REALTIME_CLIENT_DECISION,
  REALTIME_CLIENT_METRICS,
  REALTIME_CLIENT_UX_FA,
  REALTIME_TOKEN_API,
  resolveRealtimeUxMessage,
  toastMessageForChannel,
  topicMatchesFilter,
  toMqttWebSocketUrl,
} from "./index.js";

function ownedStoreOk(storeId = "st-1") {
  return {
    async resolveOwnedStore() {
      return { status: "ok" as const, storeId };
    },
  };
}

describe("ADR-039 / ADR-124 Realtime Client Strategy MQTT with Poll Fallback", () => {
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
    expect(REALTIME_CLIENT_DECISION.runtimeAdr).toBe("ADR-124");
    expect(REALTIME_CLIENT_DECISION.pollIntervalMs).toBe(15_000);
    expect(REALTIME_TOKEN_API.path).toBe("/api/v1/realtime/token");
    expect(REALTIME_TOKEN_API.method).toBe("POST");
    expect(REALTIME_TOKEN_API.forbiddenIdentityHeaders).toContain(
      "x-merchant-id",
    );
    expect(DEFAULT_POLL_INTERVAL_MS).toBe(15_000);
    expect(DEFAULT_RECONNECT_BACKOFF.maxDelayMs).toBe(30_000);
    expect(CHANNEL_QUERY_ENTITIES.sales).toContain("sales");
    expect(CHANNEL_UI_QUERY_PREFIXES.orders).toContain("orders");
    expect(REALTIME_CLIENT.metrics.disconnect).toBe(
      REALTIME_CLIENT_METRICS.disconnect,
    );
    expect(REALTIME_CLIENT.requirements.mqttJsBrowserAdapter).toBe(true);

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
    expect(
      topicMatchesFilter(
        "mos/local/merchant/m-1/orders",
        "mos/local/merchant/m-1/#",
      ),
    ).toBe(true);
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
        ...ownedStoreOk("st-1"),
        env: "local",
        brokerUrlHint: "mqtt://localhost:1883",
      },
    );
    expect(ok.status).toBe(200);
    if (ok.status !== 200) throw new Error("expected 200");
    expect(ok.body.data.merchantId).toBe("m-1");
    expect(ok.body.data.storeId).toBe("st-1");
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
        ...ownedStoreOk(),
        env: "local",
        brokerUrlHint: "mqtt://localhost:1883",
      },
    );
    expect(denied.status).toBe(401);
    if (denied.status !== 401) throw new Error("expected 401");
    expect(denied.body.error.code).toBe("UNAUTHORIZED");
    expect(denied.body.error.message).toMatch(/[\u0600-\u06FF]/);
    expect(denied.body.error.correlationId).toBe("corr-1");

    // ADR-119 — header-only identity must never mint tokens
    const headerOnly = await handleRealtimeTokenRequest(
      {
        method: "POST",
        headers: {
          get(name: string) {
            if (name.toLowerCase() === "x-merchant-id") return "spoofed-merchant";
            return null;
          },
        },
      },
      {
        authorizer: {
          async resolveMerchantSession() {
            return null;
          },
        },
        ...ownedStoreOk(),
        env: "staging",
        brokerUrlHint: "mqtt://localhost:1883",
      },
    );
    expect(headerOnly.status).toBe(401);

    expect(createSuccessEnvelope({ ok: true }).data.ok).toBe(true);
    expect(createErrorEnvelope({ code: "UNAUTHORIZED" }).error.message).toMatch(
      /[\u0600-\u06FF]/,
    );
  });

  it("denies cross-store token mint with Persian 403", async () => {
    const forbidden = await handleRealtimeTokenRequest(
      { method: "POST", headers: { get: () => null } },
      {
        authorizer: {
          async resolveMerchantSession() {
            return { merchantId: "m-1" };
          },
        },
        async resolveOwnedStore() {
          return { status: "forbidden" };
        },
        requestedStoreId: "other-store",
        env: "local",
        brokerUrlHint: "mqtt://localhost:1883",
      },
    );
    expect(forbidden.status).toBe(403);
    if (forbidden.status !== 403) throw new Error("expected 403");
    expect(forbidden.body.error.message).toMatch(/[\u0600-\u06FF]/);
  });

  it("invalidates TanStack Query when MQTT sales message arrives", async () => {
    const broker = new InMemoryMqttBroker();
    const transport = createInMemoryRealtimeTransport(broker);
    const queryClient = createMerchantQueryClient();
    const scope = { merchantId: "m-sales", storeId: "st-1" };
    const salesKey = buildScopedQueryKey(scope, "sales");
    queryClient.setQueryData(salesKey, [{ id: "old" }]);
    queryClient.setQueryData(["pos", "search", "آب"], []);

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
          storeId: "st-1",
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
      payload: JSON.stringify({
        eventType: "SaleCompleted",
        eventId: "e1",
        storeId: "st-1",
      }),
      qos: 1,
    });

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
    expect(
      calls.some(
        (arg) =>
          arg !== undefined &&
          Array.isArray(arg.queryKey) &&
          arg.queryKey[0] === "pos",
      ),
    ).toBe(true);

    expect(extractMerchantChannelFromTopic(topic)).toBe("sales");
    await invalidateQueriesForChannel(queryClient, scope, "orders");

    await client.stop();
    expect(client.getState()).toBe("stopped");
  });

  it("ignores cross-store envelopes when client is store-scoped", async () => {
    const broker = new InMemoryMqttBroker();
    const transport = createInMemoryRealtimeTransport(broker);
    const queryClient = createMerchantQueryClient();
    const scope = { merchantId: "m-1", storeId: "st-a" };
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const client = createRealtimeClient({
      transport,
      queryClient,
      scope,
      env: "local",
      fetchToken: async () => {
        const creds = mintMqttClientCredentials({
          merchantId: "m-1",
          env: "local",
          brokerUrlHint: "ws://localhost:8083/mqtt",
        });
        return {
          username: creds.username,
          password: creds.password,
          expiresAt: creds.expiresAt.toISOString(),
          merchantId: creds.merchantId,
          storeId: "st-a",
          subscribeAcl: creds.subscribeAcl,
          brokerUrl: "ws://localhost:8083/mqtt",
        };
      },
      schedule: () => ({ clear: () => undefined }),
    });

    await client.start();
    const topic = buildMerchantTopic({
      env: "local",
      merchantId: "m-1",
      channel: "orders",
    });
    await broker.publish({
      topic,
      payload: JSON.stringify({
        eventType: "OrderCreated",
        storeId: "st-b",
      }),
      qos: 1,
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(
      envelopeMatchesStoreScope(scope, JSON.stringify({ storeId: "st-b" })),
    ).toBe(false);
    expect(
      envelopeMatchesStoreScope(scope, JSON.stringify({ storeId: "st-a" })),
    ).toBe(true);

    await client.stop();
  });

  it("enters poll-only mode when mqttEnabled=false (test flag)", async () => {
    expect(isMqttClientEnabled({ NEXT_PUBLIC_MOS_MQTT_CLIENT: "0" })).toBe(
      false,
    );
    expect(isMqttClientEnabled({})).toBe(true);

    const broker = new InMemoryMqttBroker();
    const transport = createInMemoryRealtimeTransport(broker);
    const queryClient = createMerchantQueryClient();
    const scope = { merchantId: "m-poll", storeId: "st-1" };
    queryClient.setQueryData(["orders", "list", "st-1"], []);

    const client = createRealtimeClient({
      transport,
      queryClient,
      scope,
      env: "local",
      mqttEnabled: false,
      pollIntervalMs: 50,
      schedule: () => ({ clear: () => undefined }),
      fetchToken: async () => {
        throw new Error("token must not be fetched when MQTT disabled");
      },
    });

    await client.start();
    expect(client.getState()).toBe("poll_fallback");
    expect(resolveRealtimeUxMessage(client.getUxKey())).toBe(
      REALTIME_CLIENT_UX_FA.POLL_FALLBACK,
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    await client.runPollCycle();
    expect(
      invalidateSpy.mock.calls.some(
        (c) =>
          c[0] !== undefined &&
          Array.isArray(c[0].queryKey) &&
          c[0].queryKey[0] === "orders",
      ),
    ).toBe(true);

    await client.stop();
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
          storeId: "st-default",
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

    expect(
      computeReconnectDelayMs(0, {
        initialDelayMs: 100,
        maxDelayMs: 800,
        multiplier: 2,
        fullJitter: false,
      }),
    ).toBe(100);
    expect(
      computeReconnectDelayMs(3, {
        initialDelayMs: 100,
        maxDelayMs: 800,
        multiplier: 2,
        fullJitter: false,
      }),
    ).toBe(800);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    await client.runPollCycle();
    expect(invalidateSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

    await client.stop();
  });

  it("ships Persian RTL reconnect and order toast copy", () => {
    expect(REALTIME_CLIENT_UX_FA.dir).toBe("rtl");
    expect(REALTIME_CLIENT_UX_FA.locale).toBe("fa-IR");
    expect(REALTIME_CLIENT_UX_FA.CONNECTED).toMatch(/[\u0600-\u06FF]/);
    expect(REALTIME_CLIENT_UX_FA.POLL_FALLBACK).toMatch(/[\u0600-\u06FF]/);
    expect(REALTIME_CLIENT_UX_FA.RECONNECTING).toMatch(/[\u0600-\u06FF]/);
    expect(REALTIME_CLIENT_UX_FA.OFFLINE).toMatch(/[\u0600-\u06FF]/);
    expect(REALTIME_CLIENT_UX_FA.NEW_ORDER).toBe("سفارش جدید");
    expect(toastMessageForChannel("orders")).toBe("سفارش جدید");
    expect(() => assertPersianRealtimeClientCopy()).not.toThrow();
  });
});
