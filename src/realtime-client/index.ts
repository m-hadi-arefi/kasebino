/**
 * ADR-039 — Realtime Client Strategy MQTT with Poll Fallback.
 *
 * MQTT over WebSocket to EMQX preferred; invalidate TanStack Query on
 * envelopes; HTTP poll fallback on disconnect; exponential reconnect
 * backoff for Iranian mobile networks; Persian reconnect toast copy.
 *
 * Publish plane: `src/emqx-realtime` (ADR-038).
 * Normative prose: docs/architecture/08-real-time-architecture.md
 */

import { EVENT_UX_FA } from "../event-driven/index.js";
import {
  CLIENT_CREDENTIALS,
  EMQX_DECISION,
  EMQX_UX_FA,
} from "../emqx-realtime/index.js";
import { DATA_FETCHING_LIBRARY } from "../data-fetching/index.js";
import type { RealtimeUxKey } from "./client.js";

export {
  computeReconnectDelayMs,
  DEFAULT_RECONNECT_BACKOFF,
  nextBackoffAttempt,
  resetBackoff,
  type BackoffClock,
  type ReconnectBackoffConfig,
} from "./backoff.js";

export {
  CHANNEL_QUERY_ENTITIES,
  createRealtimeClient,
  DEFAULT_POLL_INTERVAL_MS,
  extractMerchantChannelFromTopic,
  invalidatePollFallbackEntities,
  invalidateQueriesForChannel,
  POLL_FALLBACK_ENTITIES,
  type FetchRealtimeToken,
  type PollFallbackEntity,
  type QueryInvalidator,
  type RealtimeClient,
  type RealtimeClientOptions,
  type RealtimeConnectionState,
  type RealtimeScheduler,
  type RealtimeUxKey,
  type SchedulerHandle,
} from "./client.js";

export {
  buildMqttJsConnectOptions,
  createInMemoryRealtimeTransport,
  toMqttWebSocketUrl,
  type InMemoryRealtimeTransport,
  type RealtimeMqttConnectOptions,
  type RealtimeMqttMessage,
  type RealtimeMqttMessageHandler,
  type RealtimeMqttTransport,
} from "./transport.js";

export {
  handleRealtimeTokenRequest,
  REALTIME_TOKEN_API,
  type MintRealtimeTokenDeps,
  type RealtimeTokenAuthorizer,
  type RealtimeTokenHandlerResult,
  type RealtimeTokenResponse,
} from "./token.js";

/** Binding Decision (ADR-039). */
export const REALTIME_CLIENT_DECISION = {
  adr: "ADR-039",
  pattern: "mqtt_over_websocket_with_poll_fallback" as const,
  transportPreferred: "mqtt_over_websocket" as const,
  broker: EMQX_DECISION.broker,
  invalidateTanStackQuery: true,
  queryLibrary: DATA_FETCHING_LIBRARY.package,
  pollFallbackOnDisconnect: true,
  reconnectBackoff: true,
  customAppWebsocketStackForbidden: true,
  shortLivedTokenApi: CLIENT_CREDENTIALS.tokenApiPathReserved,
  publishPlane: "src/emqx-realtime",
  publishAdr: "ADR-038",
  rationale: "resilience_on_iranian_mobile_networks",
  architectureDoc: "docs/architecture/08-real-time-architecture.md",
} as const;

export const REALTIME_CLIENT_PATHS = {
  package: "src/realtime-client/",
  tokenRoute: "app/api/v1/realtime/token/route.ts",
  techDoc: "docs/tech/emqx.md",
} as const;

export const REALTIME_CLIENT_REQUIREMENTS = {
  mqttPreferred: true,
  pollFallback: true,
  tanstackInvalidation: true,
  reconnectBackoff: true,
  persianReconnectToasts: true,
  tokenMintApi: true,
  topicAclVia038: true,
  /** Real mqtt.js socket adapter may wire boards later; port + strategy land here. */
  mqttJsAdapterOptional: true,
} as const;

/** Analytics / ops metric names (emit deferred to ADR-074). */
export const REALTIME_CLIENT_METRICS = {
  reconnectAttempt: "realtime_client_reconnect_attempt",
  reconnectSuccess: "realtime_client_reconnect_success",
  disconnect: "realtime_client_disconnect",
  pollFallbackEnter: "realtime_client_poll_fallback_enter",
  pollFallbackExit: "realtime_client_poll_fallback_exit",
  warehouseEmitDeferred: true,
  detailDeferredTo: "ADR-074",
} as const;

/**
 * Iranian First — user-visible realtime connection toasts (fa-IR + RTL).
 * Wire schemas English; presenters render these strings.
 */
export const REALTIME_CLIENT_UX_FA = {
  ...EVENT_UX_FA,
  dir: "rtl" as const,
  locale: "fa-IR" as const,
  notificationDrawerRtl: EMQX_UX_FA.notificationDrawerRtl,
  CONNECTED: "اتصال لحظه‌ای برقرار شد.",
  POLL_FALLBACK:
    "اتصال لحظه‌ای قطع است؛ به‌روزرسانی دوره‌ای فعال شد.",
  RECONNECTING: EVENT_UX_FA.REALTIME_RECONNECTING,
  OFFLINE: EVENT_UX_FA.REALTIME_OFFLINE,
} as const;

export type RealtimeClientUxKey = keyof Pick<
  typeof REALTIME_CLIENT_UX_FA,
  "CONNECTED" | "POLL_FALLBACK" | "RECONNECTING" | "OFFLINE"
>;

export function resolveRealtimeUxMessage(key: RealtimeUxKey): string {
  switch (key) {
    case "connected":
      return REALTIME_CLIENT_UX_FA.CONNECTED;
    case "poll_fallback":
      return REALTIME_CLIENT_UX_FA.POLL_FALLBACK;
    case "reconnecting":
    case "connecting":
      return REALTIME_CLIENT_UX_FA.RECONNECTING;
    case "offline":
      return REALTIME_CLIENT_UX_FA.OFFLINE;
    case "idle":
    default:
      return REALTIME_CLIENT_UX_FA.OFFLINE;
  }
}

export function assertPersianRealtimeClientCopy(): void {
  if (
    REALTIME_CLIENT_UX_FA.dir !== "rtl" ||
    REALTIME_CLIENT_UX_FA.locale !== "fa-IR"
  ) {
    throw new Error(
      "Realtime client UX must be fa-IR + rtl (ADR-039 Iranian First).",
    );
  }
  for (const msg of [
    REALTIME_CLIENT_UX_FA.CONNECTED,
    REALTIME_CLIENT_UX_FA.POLL_FALLBACK,
    REALTIME_CLIENT_UX_FA.RECONNECTING,
    REALTIME_CLIENT_UX_FA.OFFLINE,
    REALTIME_CLIENT_UX_FA.NOTIFICATION_DRAWER_TITLE,
  ]) {
    if (!/[\u0600-\u06FF]/.test(msg)) {
      throw new Error(
        "Realtime client user-visible copy must include Persian script (ADR-039).",
      );
    }
  }
}

export function assertMqttPreferredOverCustomWs(
  usesCustomAppWebsocketStack: boolean,
): void {
  if (usesCustomAppWebsocketStack) {
    throw new Error(
      "Custom app WebSocket protocol is forbidden; use MQTT over WebSocket to EMQX (ADR-039).",
    );
  }
  if (REALTIME_CLIENT_DECISION.transportPreferred !== "mqtt_over_websocket") {
    throw new Error(
      "Realtime transport must prefer mqtt_over_websocket (ADR-039).",
    );
  }
}

export function assertPollFallbackEnabled(enabled: boolean): void {
  if (!enabled || !REALTIME_CLIENT_DECISION.pollFallbackOnDisconnect) {
    throw new Error(
      "Poll fallback on MQTT disconnect is required (ADR-039).",
    );
  }
}

export const REALTIME_CLIENT = {
  decision: REALTIME_CLIENT_DECISION,
  paths: REALTIME_CLIENT_PATHS,
  requirements: REALTIME_CLIENT_REQUIREMENTS,
  metrics: REALTIME_CLIENT_METRICS,
  uxFa: REALTIME_CLIENT_UX_FA,
} as const;
