/**
 * ADR-038 — EMQX Event Bus / Realtime Architecture.
 *
 * EMQX MQTT topics per merchant; QoS1 publish; ACL by tenant;
 * outbox → EMQX publish after commit; never block checkout on publish.
 *
 * Compose service shipped by ADR-066. Real mqtt.js *publish* adapter may still
 * wire via `EmqxPublishPort`. Browser MQTT client + poll fallback →
 * `src/realtime-client` (ADR-039).
 *
 * Normative prose: docs/architecture/08-real-time-architecture.md,
 * docs/architecture/17-message-broker-architecture.md, docs/tech/emqx.md
 */

import { randomBytes, randomUUID } from "node:crypto";

import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_SERVICE_PORTS,
} from "../docker-compose-parity/index.js";
import {
  EVENT_UX_FA,
  type EventEnvelope,
  type OutboxConsumerName,
} from "../event-driven/index.js";
import type { OutboxDispatchHandler, OutboxMessage } from "../outbox/index.js";
import { TENANT_KEY_PROPAGATION } from "../multi-tenant-isolation/index.js";

import type { EmqxPublishPort, MqttQos } from "./port.js";
import {
  ADMIN_TOPIC_CHANNELS,
  MERCHANT_TOPIC_CHANNELS,
  TOPIC_LAYOUT_CORE,
  buildAdminTopic,
  buildMerchantSubscribeFilter,
  buildMerchantTopic,
  type AdminTopicChannel,
  type MerchantTopicChannel,
} from "./topics.js";

export type {
  EmqxBrokerPort,
  EmqxPublishInput,
  EmqxPublishPort,
  EmqxSubscribeHandler,
  MqttQos,
} from "./port.js";
export { InMemoryMqttBroker } from "./in-memory-broker.js";
export {
  ADMIN_TOPIC_CHANNELS,
  MERCHANT_TOPIC_CHANNELS,
  buildAdminTopic,
  buildMerchantSubscribeFilter,
  buildMerchantTopic,
  type AdminTopicChannel,
  type MerchantTopicChannel,
  type TopicKind,
} from "./topics.js";

/** Engine identity — MQTT realtime / event bus (compose EMQX). */
export const EMQX_ENGINE = {
  name: "emqx",
  role: "mqtt_event_bus",
  plane: "realtime",
  protocol: "mqtt" as const,
  composePorts: COMPOSE_SERVICE_PORTS.emqx,
  mqttPort: COMPOSE_SERVICE_PORTS.emqx[0],
  wsPort: COMPOSE_SERVICE_PORTS.emqx[1],
  dashboardPort: COMPOSE_SERVICE_PORTS.emqx[2],
  neverSourceOfTruth: true,
  soleSourceOfTruthForbidden: true,
} as const;

/** ADR-038 Decision — binding realtime broker stance. */
export const EMQX_DECISION = {
  pattern: "emqx_mqtt_tenant_topics" as const,
  broker: "emqx" as const,
  qosPublish: 1 as MqttQos,
  neverBlockCheckoutOnPublish: true,
  publishViaOutboxAfterCommit: true,
  syncPublishInCompleteSaleForbidden: true,
  aclByTenant: true,
  shortLivedClientCreds: true,
  payloadIsCanonicalEnvelope: true,
  keepPayloadsLean: true,
  clientsRefetchDetailsViaApi: true,
  detailAdr: "ADR-038",
  clientStrategyAdr: "ADR-039",
  outboxConsumer: "emqx_realtime" as OutboxConsumerName,
  architectureDoc: "docs/architecture/08-real-time-architecture.md",
  messageBrokerDoc: "docs/architecture/17-message-broker-architecture.md",
  techDoc: "docs/tech/emqx.md",
} as const;

export const PUBLISH_QOS: MqttQos = EMQX_DECISION.qosPublish;

/**
 * Connection env keys — documented in `.env.example` (ADR-066 / ADR-068).
 */
export const CONNECTION = {
  urlEnv: "MQTT_URL",
  mqttPortEnv: "EMQX_MQTT_PORT",
  wsPortEnv: "EMQX_WS_PORT",
  dashboardPortEnv: "EMQX_DASHBOARD_PORT",
  dashboardUserEnv: "EMQX_DASHBOARD_USER",
  dashboardPasswordEnv: "EMQX_DASHBOARD_PASSWORD",
  documentedIn: [COMPOSE_FILES.envExample, COMPOSE_FILES.compose] as const,
  schemeHints: ["mqtt://", "mqtts://", "ws://", "wss://"] as const,
} as const;

export const EMQX_ENV_KEYS = [
  CONNECTION.urlEnv,
  CONNECTION.mqttPortEnv,
  CONNECTION.wsPortEnv,
  CONNECTION.dashboardPortEnv,
  CONNECTION.dashboardUserEnv,
  CONNECTION.dashboardPasswordEnv,
] as const;

export const PLACEMENT = {
  package: "src/emqx-realtime/",
  port: "src/emqx-realtime/port.ts",
  inMemoryBroker: "src/emqx-realtime/in-memory-broker.ts",
  clientStub: "src/infrastructure/emqx/client.ts",
  mqttPublisher: "src/infrastructure/emqx/mqtt-publisher.ts",
  workerEntrypoint: "src/workers/outbox-worker.ts",
  techFolderConvention: "src/shared/infrastructure/mqtt",
  composeService: "emqx",
  composeWorkerService: "worker",
  outboxConsumer: EMQX_DECISION.outboxConsumer,
  realtimeArchitectureDoc: EMQX_DECISION.architectureDoc,
  messageBrokerDoc: EMQX_DECISION.messageBrokerDoc,
  techDoc: EMQX_DECISION.techDoc,
} as const;

/** Topic prefix / layout — docs/architecture/08 + 17. */
export const TOPIC_LAYOUT = {
  ...TOPIC_LAYOUT_CORE,
  alignsWithTenantPropagation: TENANT_KEY_PROPAGATION.emqxTopicsIncludeMerchantId,
} as const;

export const EVENT_TOPIC_MAP = {
  SaleCreated: { kind: "merchant", channel: "sales" },
  SaleCompleted: { kind: "merchant", channel: "sales" },
  SaleCanceled: { kind: "merchant", channel: "sales" },
  OrderCreated: { kind: "merchant", channel: "orders" },
  OrderPaid: { kind: "merchant", channel: "orders" },
  OrderCanceled: { kind: "merchant", channel: "orders" },
  OrderReadyForPickup: { kind: "merchant", channel: "orders" },
  OrderPickedUp: { kind: "merchant", channel: "orders" },
  InventoryChanged: { kind: "merchant", channel: "inventory" },
  InventoryLow: { kind: "merchant", channel: "inventory" },
  InventoryOutOfStock: { kind: "merchant", channel: "inventory" },
  ProductUpdated: { kind: "merchant", channel: "inventory" },
  CustomerCreated: { kind: "merchant", channel: "customers" },
  CustomerUpdated: { kind: "merchant", channel: "customers" },
  CustomerDeleted: { kind: "merchant", channel: "customers" },
  MembershipCreated: { kind: "merchant", channel: "customers" },
  PointsEarned: { kind: "merchant", channel: "loyalty" },
  PointsRedeemed: { kind: "merchant", channel: "loyalty" },
  PointsExpired: { kind: "merchant", channel: "loyalty" },
  StoreUpdated: { kind: "merchant", channel: "dashboard" },
  StoreCreated: { kind: "merchant", channel: "dashboard" },
  MerchantCreated: { kind: "admin", channel: "merchants" },
  MerchantActivated: { kind: "admin", channel: "merchants" },
  MerchantUpdated: { kind: "admin", channel: "merchants" },
} as const satisfies Record<
  string,
  | { kind: "merchant"; channel: MerchantTopicChannel }
  | { kind: "admin"; channel: AdminTopicChannel }
>;

export type MappedEventType = keyof typeof EVENT_TOPIC_MAP;

export const EMQX_REQUIREMENTS = {
  tenantScopedTopics: true,
  qos1Publish: true,
  aclByTenant: true,
  neverBlockCheckout: true,
  outboxPublishPath: true,
  composeEmqxFromAdr066: true,
  shortLivedClientCreds: true,
  /** Full mqtt.js *publish* protocol client not required in ADR-038 — port + stub. */
  noMqttSdkRequiredInThisAdr: true,
  /** Browser subscribe + poll fallback → `src/realtime-client` (ADR-039). */
  clientStrategyDeferredTo039: false,
  clientStrategyPackage: "src/realtime-client",
  clientStrategyAdr: "ADR-039",
} as const;

/** Failure: EMQX down → outbox retries; UI poll fallback (ADR-039). */
export const FAILURE_MODES = {
  brokerDown: {
    policy: "outbox_retry",
    uiFallback: "poll",
    uiFallbackAdr: "ADR-039",
    neverBlockCheckout: true,
  },
  disconnectMetrics: {
    contracted: true,
    detailDeferredTo: "ADR-074",
    note: "client_disconnect_rate_and_publish_failures",
  },
} as const;

/**
 * Iranian First — user-visible realtime copy stays Persian + RTL.
 * Wire schemas English; presentation layer uses these stubs (drawer UI later).
 */
export const EMQX_UX_FA = {
  ...EVENT_UX_FA,
  dir: "rtl" as const,
  locale: "fa-IR" as const,
  notificationDrawerRtl: true,
} as const;

/** Short-lived MQTT client credentials (minted by backend). */
export const CLIENT_CREDENTIALS = {
  shortLived: true,
  defaultTtlSeconds: 900,
  maxTtlSeconds: 3_600,
  tokenApiPathReserved: "/api/v1/realtime/token",
  /** HTTP Route Handler + browser MQTT client → `src/realtime-client` (ADR-039). */
  httpRouteImplementedIn: "src/realtime-client",
  httpRouteAdr: "ADR-039",
} as const;

export type MqttClientCredentials = {
  username: string;
  password: string;
  expiresAt: Date;
  merchantId: string;
  /** ACL subscribe filters minted for this session. */
  subscribeAcl: readonly string[];
  /** Broker URL hint (from MQTT_URL); optional for mint tests. */
  brokerUrlHint?: string;
};

export type MintMqttClientCredentialsInput = {
  merchantId: string;
  env: string;
  ttlSeconds?: number;
  now?: () => Date;
  brokerUrlHint?: string;
};

export function resolveTopicForEvent(input: {
  eventType: string;
  merchantId: string;
  env: string;
}): string | null {
  const mapping = EVENT_TOPIC_MAP[input.eventType as MappedEventType];
  if (!mapping) return null;
  if (mapping.kind === "admin") {
    return buildAdminTopic({ env: input.env, channel: mapping.channel });
  }
  return buildMerchantTopic({
    env: input.env,
    merchantId: input.merchantId,
    channel: mapping.channel,
  });
}

export function resolveTopicForEnvelope(
  envelope: Pick<EventEnvelope, "eventType" | "merchantId">,
  env: string,
): string | null {
  return resolveTopicForEvent({
    eventType: envelope.eventType,
    merchantId: envelope.merchantId,
    env,
  });
}

/**
 * Topic ACL — merchant clients may only subscribe under their merchantId.
 * Platform admin may subscribe to admin topics (ops-audited separately).
 */
export function assertMerchantMaySubscribe(input: {
  merchantId: string;
  env: string;
  topicOrFilter: string;
}): void {
  const allowed = buildMerchantSubscribeFilter({
    env: input.env,
    merchantId: input.merchantId,
  });
  const topic = input.topicOrFilter.trim();
  const prefix = `${TOPIC_LAYOUT.prefix}/${input.env.trim()}/merchant/${input.merchantId.trim()}/`;
  const ok =
    topic === allowed ||
    topic.startsWith(prefix) ||
    topic === prefix.slice(0, -1);

  if (!ok) {
    throw new Error(
      `MQTT ACL deny: merchant "${input.merchantId}" may not subscribe to "${topic}" (ADR-038).`,
    );
  }
}

export function assertAdminTopic(topicOrFilter: string, env: string): void {
  const prefix = `${TOPIC_LAYOUT.prefix}/${env.trim()}/admin/`;
  if (
    !topicOrFilter.startsWith(prefix) &&
    topicOrFilter !== `${TOPIC_LAYOUT.prefix}/${env.trim()}/admin/#`
  ) {
    throw new Error(
      `MQTT admin ACL expects topic under "${prefix}" (ADR-038); got "${topicOrFilter}".`,
    );
  }
}

/** Deny cross-tenant subscribe attempts. */
export function assertTenantTopicIsolation(input: {
  actorMerchantId: string;
  otherMerchantId: string;
  env: string;
}): void {
  if (input.actorMerchantId === input.otherMerchantId) {
    throw new Error(
      "assertTenantTopicIsolation requires distinct merchant ids (ADR-038).",
    );
  }
  const foreign = buildMerchantTopic({
    env: input.env,
    merchantId: input.otherMerchantId,
    channel: "sales",
  });
  expectThrowAcl(() =>
    assertMerchantMaySubscribe({
      merchantId: input.actorMerchantId,
      env: input.env,
      topicOrFilter: foreign,
    }),
  );
}

function expectThrowAcl(fn: () => void): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(
    "Expected cross-tenant MQTT subscribe to be denied (ADR-038).",
  );
}

/**
 * Mint short-lived MQTT client credentials with merchant-scoped subscribe ACL.
 * Persistence / EMQX auth hookup is ops; HTTP route → ADR-039.
 */
export function mintMqttClientCredentials(
  input: MintMqttClientCredentialsInput,
): MqttClientCredentials {
  const merchantId = input.merchantId.trim();
  if (!merchantId) {
    throw new Error("MQTT client credentials require merchantId (ADR-038).");
  }
  const ttl =
    input.ttlSeconds === undefined
      ? CLIENT_CREDENTIALS.defaultTtlSeconds
      : input.ttlSeconds;
  if (
    !Number.isFinite(ttl) ||
    ttl <= 0 ||
    ttl > CLIENT_CREDENTIALS.maxTtlSeconds
  ) {
    throw new Error(
      `MQTT client credential TTL must be 1..${CLIENT_CREDENTIALS.maxTtlSeconds}s (ADR-038).`,
    );
  }
  const now = input.now ?? (() => new Date());
  const expiresAt = new Date(now().getTime() + ttl * 1000);
  const subscribeAcl = [
    buildMerchantSubscribeFilter({ env: input.env, merchantId }),
  ] as const;

  return {
    username: `m/${merchantId}/${randomUUID()}`,
    password: randomBytes(24).toString("base64url"),
    expiresAt,
    merchantId,
    subscribeAcl,
    ...(input.brokerUrlHint !== undefined
      ? { brokerUrlHint: input.brokerUrlHint }
      : {}),
  };
}

export function isCredentialExpired(
  creds: Pick<MqttClientCredentials, "expiresAt">,
  now: () => Date = () => new Date(),
): boolean {
  return now().getTime() >= creds.expiresAt.getTime();
}

export type EmqxOutboxHandlerOptions = {
  broker: EmqxPublishPort;
  env?: string;
  qos?: MqttQos;
};

/**
 * Outbox `emqx_realtime` consumer — publish envelope after commit.
 * Failures throw so the outbox worker retries (at-least-once).
 */
export function createEmqxOutboxHandler(
  options: EmqxOutboxHandlerOptions,
): OutboxDispatchHandler {
  const env = options.env ?? "local";
  const qos = options.qos ?? PUBLISH_QOS;

  return async (message: OutboxMessage) => {
    const topic = resolveTopicForEnvelope(message.envelope, env);
    if (!topic) {
      return;
    }
    await options.broker.publish({
      topic,
      payload: JSON.stringify(message.envelope),
      qos,
      retain: false,
    });
  };
}

export function assertNeverBlockCheckoutOnPublish(
  blocksCheckout: boolean,
): void {
  if (blocksCheckout) {
    throw new Error(
      "Must never block checkout / CompleteSale on EMQX publish (ADR-038); use outbox after commit.",
    );
  }
  if (!EMQX_DECISION.neverBlockCheckoutOnPublish) {
    throw new Error(
      "EMQX_DECISION.neverBlockCheckoutOnPublish must be true (ADR-038).",
    );
  }
  if (!EMQX_DECISION.syncPublishInCompleteSaleForbidden) {
    throw new Error(
      "Sync MQTT publish in CompleteSale is forbidden (ADR-038).",
    );
  }
}

export function assertPublishQos1(qos: number): void {
  if (qos !== PUBLISH_QOS || PUBLISH_QOS !== 1) {
    throw new Error(`EMQX publish QoS must be 1 (ADR-038); got ${qos}.`);
  }
}

export function assertEmqxRole(role: string): void {
  if (role !== EMQX_ENGINE.role) {
    throw new Error(
      `EMQX role must be "${EMQX_ENGINE.role}" (ADR-038); got "${role}".`,
    );
  }
  if (COMPOSE_DATA_PLANES.emqx.role !== EMQX_ENGINE.role) {
    throw new Error(
      "Compose emqx plane role must match mqtt_event_bus (ADR-038 / ADR-066).",
    );
  }
}

export function assertMqttUrlEnvKey(envVar: string): void {
  if (envVar !== CONNECTION.urlEnv) {
    throw new Error(
      `MQTT connection env var must be "${CONNECTION.urlEnv}" (ADR-038); got "${envVar}".`,
    );
  }
}

export function assertTopicsIncludeMerchantId(
  topicsIncludeMerchantId: boolean,
): void {
  if (!topicsIncludeMerchantId || !TOPIC_LAYOUT.merchantIdRequired) {
    throw new Error(
      "EMQX merchant topics must include merchantId (ADR-038 / ADR-048).",
    );
  }
  if (!TENANT_KEY_PROPAGATION.emqxTopicsIncludeMerchantId) {
    throw new Error(
      "TENANT_KEY_PROPAGATION.emqxTopicsIncludeMerchantId must be true (ADR-038).",
    );
  }
}

export function assertPersianRealtimeCopy(): void {
  if (EMQX_UX_FA.dir !== "rtl" || EMQX_UX_FA.locale !== "fa-IR") {
    throw new Error("Realtime UX must be fa-IR + rtl (ADR-038 Iranian First).");
  }
  for (const msg of [
    EMQX_UX_FA.SALE_COMPLETED_TOAST,
    EMQX_UX_FA.REALTIME_OFFLINE,
    EMQX_UX_FA.REALTIME_RECONNECTING,
    EMQX_UX_FA.NOTIFICATION_DRAWER_TITLE,
  ]) {
    if (!/[\u0600-\u06FF]/.test(msg)) {
      throw new Error(
        "Realtime user-visible copy must include Persian script (ADR-038).",
      );
    }
  }
}

export const EMQX_REALTIME = {
  engine: EMQX_ENGINE,
  decision: EMQX_DECISION,
  connection: CONNECTION,
  envKeys: EMQX_ENV_KEYS,
  placement: PLACEMENT,
  topicLayout: TOPIC_LAYOUT,
  merchantChannels: MERCHANT_TOPIC_CHANNELS,
  adminChannels: ADMIN_TOPIC_CHANNELS,
  eventTopicMap: EVENT_TOPIC_MAP,
  requirements: EMQX_REQUIREMENTS,
  failureModes: FAILURE_MODES,
  clientCredentials: CLIENT_CREDENTIALS,
  uxFa: EMQX_UX_FA,
  publishQos: PUBLISH_QOS,
  alignsWith: {
    composeEmqxPlane: COMPOSE_DATA_PLANES.emqx.plane,
    composeEmqxRole: COMPOSE_DATA_PLANES.emqx.role,
  },
} as const;
