import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_SERVICE_PORTS,
  extractComposeServiceNames,
} from "../../../shared/contracts/docker-compose-parity/index.js";
import { createEventEnvelope } from "../../../events/contracts/event-driven/index.js";
import {
  createEmqxConfig,
  createEmqxConfigFromEnv,
} from "../client.js";
import {
  createOutboxMessage,
  createOutboxWorker,
  InMemoryOutboxStore,
  InMemoryProcessedSet,
} from "../../../events/outbox/index.js";
import {
  assertAdminTopic,
  assertEmqxRole,
  assertMerchantMaySubscribe,
  assertMqttUrlEnvKey,
  assertNeverBlockCheckoutOnPublish,
  assertPersianRealtimeCopy,
  assertPublishQos1,
  assertTopicsIncludeMerchantId,
  buildAdminTopic,
  buildMerchantSubscribeFilter,
  buildMerchantTopic,
  CLIENT_CREDENTIALS,
  CONNECTION,
  createEmqxOutboxHandler,
  EMQX_DECISION,
  EMQX_ENGINE,
  EMQX_ENV_KEYS,
  EMQX_REALTIME,
  EMQX_REQUIREMENTS,
  EMQX_UX_FA,
  EVENT_TOPIC_MAP,
  InMemoryMqttBroker,
  isCredentialExpired,
  mintMqttClientCredentials,
  PLACEMENT,
  PUBLISH_QOS,
  resolveTopicForEvent,
  resolveTopicForEnvelope,
  TOPIC_LAYOUT,
} from "./index.js";

const root = process.cwd();

describe("ADR-038 EMQX Event Bus / Realtime Architecture", () => {
  it("locks EMQX as MQTT realtime bus (never SoT; QoS1; never block checkout)", () => {
    expect(EMQX_ENGINE.name).toBe("emqx");
    expect(EMQX_ENGINE.role).toBe("mqtt_event_bus");
    expect(EMQX_ENGINE.plane).toBe("realtime");
    expect(EMQX_ENGINE.neverSourceOfTruth).toBe(true);
    expect(EMQX_DECISION.qosPublish).toBe(1);
    expect(PUBLISH_QOS).toBe(1);
    expect(EMQX_DECISION.neverBlockCheckoutOnPublish).toBe(true);
    expect(EMQX_DECISION.publishViaOutboxAfterCommit).toBe(true);
    expect(EMQX_DECISION.syncPublishInCompleteSaleForbidden).toBe(true);
    expect(EMQX_REQUIREMENTS.neverBlockCheckout).toBe(true);
    expect(EMQX_REQUIREMENTS.noMqttSdkRequiredInThisAdr).toBe(true);
    expect(EMQX_REQUIREMENTS.clientStrategyDeferredTo039).toBe(false);
    expect(EMQX_REQUIREMENTS.clientStrategyPackage).toBe("src/infrastructure/emqx/realtime-client");
    expect(EMQX_REQUIREMENTS.clientStrategyAdr).toBe("ADR-039");

    expect(COMPOSE_DATA_PLANES.emqx.role).toBe("mqtt_event_bus");
    expect(EMQX_REALTIME.alignsWith.composeEmqxRole).toBe(
      COMPOSE_DATA_PLANES.emqx.role,
    );

    expect(() => assertEmqxRole("mqtt_event_bus")).not.toThrow();
    expect(() => assertEmqxRole("oltp_source_of_truth")).toThrow(
      /mqtt_event_bus/i,
    );
    expect(() => assertPublishQos1(1)).not.toThrow();
    expect(() => assertPublishQos1(0)).toThrow(/QoS/i);
    expect(() => assertNeverBlockCheckoutOnPublish(false)).not.toThrow();
    expect(() => assertNeverBlockCheckoutOnPublish(true)).toThrow(
      /never block checkout/i,
    );
  });

  it("documents MQTT/EMQX env keys in .env.example and compose wiring", () => {
    expect(CONNECTION.urlEnv).toBe("MQTT_URL");
    expect(EMQX_ENV_KEYS).toContain("MQTT_URL");
    expect(EMQX_ENV_KEYS).toContain("EMQX_MQTT_PORT");
    expect(EMQX_ENV_KEYS).toContain("EMQX_DASHBOARD_PASSWORD");

    expect(() => assertMqttUrlEnvKey("MQTT_URL")).not.toThrow();
    expect(() => assertMqttUrlEnvKey("EMQX_URL")).toThrow(/MQTT_URL/i);

    const envPath = join(root, COMPOSE_FILES.envExample);
    expect(existsSync(envPath)).toBe(true);
    const env = readFileSync(envPath, "utf8");
    expect(env).toMatch(/^MQTT_URL=/m);
    expect(env).toMatch(/^EMQX_MQTT_PORT=/m);
    expect(env).toMatch(/^EMQX_WS_PORT=/m);
    expect(env).toMatch(/^EMQX_DASHBOARD_PORT=/m);
    expect(env).toContain("mqtt://localhost:1883");
  });

  it("verifies compose ships emqx realtime plane", () => {
    const composePath = join(root, COMPOSE_FILES.compose);
    expect(existsSync(composePath)).toBe(true);
    const yaml = readFileSync(composePath, "utf8");
    const names = extractComposeServiceNames(yaml);

    expect(names).toContain("emqx");
    expect(yaml).toMatch(/^\s*emqx:\s*$/m);
    expect(yaml).toContain("MQTT_URL");
    expect(yaml).toContain("mqtt://emqx:1883");
    expect(yaml).toContain("emqx/emqx");
    expect(yaml).toContain('"emqx"');
    expect(yaml).toContain('"ctl"');
    expect(yaml).toContain("status");
    expect(COMPOSE_SERVICE_PORTS.emqx).toEqual([1883, 8083, 18083]);
    expect(COMPOSE_DATA_PLANES.emqx.plane).toBe("realtime");
    expect(EMQX_ENGINE.mqttPort).toBe(1883);
    expect(EMQX_ENGINE.wsPort).toBe(8083);
    expect(EMQX_ENGINE.dashboardPort).toBe(18083);
    expect(PLACEMENT.composeService).toBe("emqx");
    expect(PLACEMENT.package).toBe("src/infrastructure/emqx/contracts/");
  });

  it("builds tenant-scoped merchant topics and admin topics", () => {
    expect(
      buildMerchantTopic({
        env: "local",
        merchantId: "m-1",
        channel: "sales",
      }),
    ).toBe("mos/local/merchant/m-1/sales");
    expect(
      buildMerchantTopic({
        env: "local",
        merchantId: "m-1",
        channel: "orders",
      }),
    ).toBe("mos/local/merchant/m-1/orders");
    expect(buildAdminTopic({ env: "local", channel: "merchants" })).toBe(
      "mos/local/admin/merchants",
    );
    expect(buildAdminTopic({ env: "local", channel: "monitoring" })).toBe(
      "mos/local/admin/monitoring",
    );
    expect(
      buildMerchantSubscribeFilter({ env: "local", merchantId: "m-1" }),
    ).toBe("mos/local/merchant/m-1/#");

    expect(TOPIC_LAYOUT.merchantIdRequired).toBe(true);
    expect(() => assertTopicsIncludeMerchantId(true)).not.toThrow();
    expect(() => assertTopicsIncludeMerchantId(false)).toThrow(/merchantId/i);
    expect(() =>
      buildMerchantTopic({ env: "local", merchantId: "", channel: "sales" }),
    ).toThrow(/merchantId/i);
  });

  it("maps domain events to MQTT channels per message-broker catalog", () => {
    expect(EVENT_TOPIC_MAP.SaleCompleted.channel).toBe("sales");
    expect(EVENT_TOPIC_MAP.OrderCreated.channel).toBe("orders");
    expect(EVENT_TOPIC_MAP.InventoryChanged.channel).toBe("inventory");
    expect(EVENT_TOPIC_MAP.PointsEarned.channel).toBe("loyalty");
    expect(EVENT_TOPIC_MAP.MerchantCreated.kind).toBe("admin");
    expect(EVENT_TOPIC_MAP.MerchantCreated.channel).toBe("merchants");

    expect(
      resolveTopicForEvent({
        eventType: "SaleCompleted",
        merchantId: "m-1",
        env: "local",
      }),
    ).toBe("mos/local/merchant/m-1/sales");
    expect(
      resolveTopicForEvent({
        eventType: "OrderCreated",
        merchantId: "m-1",
        env: "local",
      }),
    ).toBe("mos/local/merchant/m-1/orders");
    expect(
      resolveTopicForEvent({
        eventType: "MerchantCreated",
        merchantId: "m-1",
        env: "local",
      }),
    ).toBe("mos/local/admin/merchants");
    expect(
      resolveTopicForEvent({
        eventType: "UnknownFutureEvent",
        merchantId: "m-1",
        env: "local",
      }),
    ).toBeNull();

    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-9",
      payload: { saleId: "s-1" },
    });
    expect(resolveTopicForEnvelope(envelope, "staging")).toBe(
      "mos/staging/merchant/m-9/sales",
    );
  });

  it("enforces tenant ACL on subscribe filters", () => {
    expect(() =>
      assertMerchantMaySubscribe({
        merchantId: "m-1",
        env: "local",
        topicOrFilter: "mos/local/merchant/m-1/sales",
      }),
    ).not.toThrow();
    expect(() =>
      assertMerchantMaySubscribe({
        merchantId: "m-1",
        env: "local",
        topicOrFilter: "mos/local/merchant/m-1/#",
      }),
    ).not.toThrow();
    expect(() =>
      assertMerchantMaySubscribe({
        merchantId: "m-1",
        env: "local",
        topicOrFilter: "mos/local/merchant/m-2/sales",
      }),
    ).toThrow(/ACL deny/i);
    expect(() =>
      assertAdminTopic("mos/local/admin/merchants", "local"),
    ).not.toThrow();
    expect(() =>
      assertAdminTopic("mos/local/merchant/m-1/sales", "local"),
    ).toThrow(/admin/i);
  });

  it("mints short-lived merchant-scoped MQTT credentials", () => {
    const fixed = new Date("2026-08-03T12:00:00.000Z");
    const creds = mintMqttClientCredentials({
      merchantId: "m-1",
      env: "local",
      ttlSeconds: 900,
      now: () => fixed,
    });
    expect(creds.merchantId).toBe("m-1");
    expect(creds.subscribeAcl).toEqual(["mos/local/merchant/m-1/#"]);
    expect(creds.expiresAt.toISOString()).toBe("2026-08-03T12:15:00.000Z");
    expect(creds.password.length).toBeGreaterThan(10);
    expect(CLIENT_CREDENTIALS.shortLived).toBe(true);
    expect(CLIENT_CREDENTIALS.tokenApiPathReserved).toBe(
      "/api/v1/realtime/token",
    );
    expect(CLIENT_CREDENTIALS.httpRouteImplementedIn).toBe(
      "src/infrastructure/emqx/realtime-client",
    );
    expect(CLIENT_CREDENTIALS.httpRouteAdr).toBe("ADR-039");

    expect(
      isCredentialExpired(creds, () => new Date("2026-08-03T12:14:59.000Z")),
    ).toBe(false);
    expect(
      isCredentialExpired(creds, () => new Date("2026-08-03T12:15:00.000Z")),
    ).toBe(true);
    expect(() =>
      mintMqttClientCredentials({
        merchantId: "m-1",
        env: "local",
        ttlSeconds: 999_999,
      }),
    ).toThrow(/TTL/i);
  });

  it("publishes via in-memory broker and outbox emqx_realtime handler", async () => {
    const broker = new InMemoryMqttBroker();
    const received: Array<{ topic: string; payload: string }> = [];
    broker.subscribe("mos/local/merchant/m-1/#", (msg) => {
      received.push({ topic: msg.topic, payload: msg.payload });
    });

    const store = new InMemoryOutboxStore();
    const processed = new InMemoryProcessedSet();
    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-1",
      storeId: "st-1",
      payload: { saleId: "sale-1", totalToman: 120_000 },
    });
    await store.enqueue({ envelope });

    const worker = createOutboxWorker({
      store,
      processed,
      consumers: ["emqx_realtime"],
      handlers: {
        emqx_realtime: createEmqxOutboxHandler({ broker, env: "local" }),
      },
    });

    const result = await worker.dispatchOnce();
    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(broker.published).toHaveLength(1);
    expect(broker.published[0]?.topic).toBe("mos/local/merchant/m-1/sales");
    expect(broker.published[0]?.qos).toBe(1);
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0]!.payload).eventType).toBe("SaleCompleted");
    expect(JSON.parse(received[0]!.payload).merchantId).toBe("m-1");
  });

  it("skips unmapped event types without failing the outbox consumer", async () => {
    const broker = new InMemoryMqttBroker();
    const message = createOutboxMessage({
      envelope: createEventEnvelope({
        eventType: "SaleCompleted",
        merchantId: "m-1",
        payload: {},
      }),
    });
    // Force an unmapped type after envelope construction (past-tense assert).
    const unmapped = {
      ...message,
      eventType: "FutureUnmappedEvent",
      envelope: { ...message.envelope, eventType: "FutureUnmappedEvent" },
    };
    await createEmqxOutboxHandler({ broker, env: "local" })(unmapped);
    expect(broker.published).toHaveLength(0);
  });

  it("resolves thin MQTT_URL client stub without connecting", () => {
    const cfg = createEmqxConfig("mqtt://localhost:1883");
    expect(cfg.url).toBe("mqtt://localhost:1883");
    expect(cfg.envVar).toBe("MQTT_URL");

    expect(
      createEmqxConfigFromEnv({ MQTT_URL: "mqtt://emqx:1883" }).url,
    ).toBe("mqtt://emqx:1883");
    expect(() => createEmqxConfig("http://bad")).toThrow(/mqtt/i);
    expect(() => createEmqxConfigFromEnv({})).toThrow(/MQTT_URL/i);
  });

  it("ships Persian RTL realtime UX stubs (Iranian First)", () => {
    expect(EMQX_UX_FA.dir).toBe("rtl");
    expect(EMQX_UX_FA.locale).toBe("fa-IR");
    expect(EMQX_UX_FA.notificationDrawerRtl).toBe(true);
    expect(() => assertPersianRealtimeCopy()).not.toThrow();
    for (const msg of [
      EMQX_UX_FA.SALE_COMPLETED_TOAST,
      EMQX_UX_FA.REALTIME_OFFLINE,
      EMQX_UX_FA.NOTIFICATION_DRAWER_TITLE,
    ]) {
      expect(msg).toMatch(/[\u0600-\u06FF]/);
    }
  });
});
