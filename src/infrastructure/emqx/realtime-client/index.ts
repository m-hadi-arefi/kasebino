/**
 * ADR-039 / ADR-124 — Realtime Client Strategy MQTT with Poll Fallback.
 *
 * MQTT over WebSocket to EMQX preferred; invalidate TanStack Query on
 * envelopes; HTTP poll fallback on disconnect; exponential reconnect
 * backoff for Iranian mobile networks; Persian reconnect toast copy.
 * Merchant staff hook wires pickup board / POS / notifications.
 *
 * Publish plane: `src/infrastructure/emqx/contracts` (ADR-038).
 * Normative prose: docs/architecture/08-real-time-architecture.md
 */

import { DATA_FETCHING_LIBRARY } from "../../../shared/contracts/data-fetching/index.js";

import { REALTIME_CLIENT_UX_FA } from "./ux.js";

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
  CHANNEL_UI_QUERY_PREFIXES,
  createRealtimeClient,
  DEFAULT_POLL_INTERVAL_MS,
  envelopeMatchesStoreScope,
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
  isMqttClientEnabled,
  resolveBrowserRealtimeEnv,
  type MqttClientEnv,
} from "./flags.js";

export {
  createMqttJsRealtimeTransport,
  topicMatchesFilter,
  type MqttJsRealtimeTransportOptions,
} from "./mqtt-js-transport.js";

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
  parseRealtimeTokenBody,
  REALTIME_TOKEN_API,
  type MintRealtimeTokenDeps,
  type RealtimeOwnedStoreResolution,
  type RealtimeStoreResolver,
  type RealtimeTokenAuthorizer,
  type RealtimeTokenHandlerResult,
  type RealtimeTokenResponse,
} from "./token.js";

export {
  assertPersianRealtimeClientCopy,
  REALTIME_CLIENT_UX_FA,
  resolveRealtimeUxMessage,
  toastMessageForChannel,
  type RealtimeClientUxKey,
} from "./ux.js";

// Client hooks live in `./use-realtime-store-channel` (marked "use client") —
// do not re-export here or App Router API routes pulling this barrel fail build.

/** Binding Decision (ADR-039 / ADR-124). */
export const REALTIME_CLIENT_DECISION = {
  adr: "ADR-039",
  runtimeAdr: "ADR-124",
  pattern: "mqtt_over_websocket_with_poll_fallback" as const,
  transportPreferred: "mqtt_over_websocket" as const,
  /** Keep aligned with EMQX_DECISION.broker without importing emqx barrel (node:crypto). */
  broker: "emqx" as const,
  invalidateTanStackQuery: true,
  queryLibrary: DATA_FETCHING_LIBRARY.package,
  pollFallbackOnDisconnect: true,
  reconnectBackoff: true,
  customAppWebsocketStackForbidden: true,
  shortLivedTokenApi: "/api/v1/realtime/token" as const,
  publishPlane: "src/infrastructure/emqx/contracts",
  publishAdr: "ADR-038",
  rationale: "resilience_on_iranian_mobile_networks",
  architectureDoc: "docs/architecture/08-real-time-architecture.md",
  pollIntervalMs: 15_000,
  mqttDisableEnv: "NEXT_PUBLIC_MOS_MQTT_CLIENT",
} as const;

export const REALTIME_CLIENT_PATHS = {
  package: "src/infrastructure/emqx/realtime-client/",
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
  mqttJsBrowserAdapter: true,
  storeScopedToken: true,
  merchantSurfaceHook: true,
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
