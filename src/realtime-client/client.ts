/**
 * Realtime client orchestrator (ADR-039).
 * MQTT preferred → invalidate TanStack Query; poll fallback on disconnect;
 * reconnect with exponential backoff.
 */

import type { QueryClient } from "@tanstack/react-query";

import {
  buildMerchantSubscribeFilter,
  buildMerchantTopic,
  type MerchantTopicChannel,
  MERCHANT_TOPIC_CHANNELS,
} from "../emqx-realtime/index.js";
import {
  buildScopedQueryKey,
  type QueryScope,
} from "../data-fetching/index.js";
import {
  computeReconnectDelayMs,
  DEFAULT_RECONNECT_BACKOFF,
  nextBackoffAttempt,
  resetBackoff,
  type BackoffClock,
  type ReconnectBackoffConfig,
} from "./backoff.js";
import type { RealtimeTokenResponse } from "./token.js";
import type { RealtimeMqttTransport } from "./transport.js";

/** Connection state machine for shop-floor UX. */
export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "poll_fallback"
  | "stopped";

/** Critical list entities polled when MQTT is down. */
export const POLL_FALLBACK_ENTITIES = [
  "sales",
  "orders",
  "inventory",
] as const;

export type PollFallbackEntity = (typeof POLL_FALLBACK_ENTITIES)[number];

/** Default poll cadence — modest bandwidth / battery on Iranian mobiles. */
export const DEFAULT_POLL_INTERVAL_MS = 15_000;

/**
 * Topic channel → TanStack Query entity names to invalidate.
 */
export const CHANNEL_QUERY_ENTITIES: Record<
  MerchantTopicChannel,
  readonly string[]
> = {
  sales: ["sales"],
  orders: ["orders"],
  inventory: ["inventory", "products"],
  customers: ["customers"],
  loyalty: ["loyalty"],
  dashboard: ["dashboard"],
  notifications: ["notifications"],
};

export function extractMerchantChannelFromTopic(
  topic: string,
): MerchantTopicChannel | null {
  const parts = topic.trim().split("/");
  // mos / env / merchant / merchantId / channel
  if (parts.length < 5 || parts[0] !== "mos" || parts[2] !== "merchant") {
    return null;
  }
  const channel = parts[4];
  if (
    channel !== undefined &&
    (MERCHANT_TOPIC_CHANNELS as readonly string[]).includes(channel)
  ) {
    return channel as MerchantTopicChannel;
  }
  return null;
}

export type QueryInvalidator = Pick<QueryClient, "invalidateQueries">;

export type SchedulerHandle = { clear: () => void };

export type RealtimeScheduler = (
  fn: () => void,
  delayMs: number,
) => SchedulerHandle;

export type FetchRealtimeToken = () => Promise<RealtimeTokenResponse>;

export type RealtimeClientOptions = {
  transport: RealtimeMqttTransport;
  queryClient: QueryInvalidator;
  fetchToken: FetchRealtimeToken;
  scope: QueryScope;
  env: string;
  /** Subscribe channels; default all merchant channels via `#` filter. */
  channels?: readonly MerchantTopicChannel[];
  pollIntervalMs?: number;
  backoff?: ReconnectBackoffConfig;
  schedule?: RealtimeScheduler;
  random?: () => number;
  onStateChange?: (state: RealtimeConnectionState) => void;
};

export type RealtimeClient = {
  start(): Promise<void>;
  stop(): Promise<void>;
  getState(): RealtimeConnectionState;
  /** Current Persian UX toast key for presenters. */
  getUxKey(): RealtimeUxKey;
  /** Force one poll cycle (also used by tests). */
  runPollCycle(): Promise<void>;
};

export type RealtimeUxKey =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "poll_fallback";

const defaultSchedule: RealtimeScheduler = (fn, delayMs) => {
  const id = setTimeout(fn, delayMs);
  return {
    clear: () => {
      clearTimeout(id);
    },
  };
};

export async function invalidateQueriesForChannel(
  queryClient: QueryInvalidator,
  scope: QueryScope,
  channel: MerchantTopicChannel,
): Promise<void> {
  const entities = CHANNEL_QUERY_ENTITIES[channel];
  for (const entity of entities) {
    const queryKey = buildScopedQueryKey(scope, entity);
    await queryClient.invalidateQueries({ queryKey });
  }
}

export async function invalidatePollFallbackEntities(
  queryClient: QueryInvalidator,
  scope: QueryScope,
): Promise<void> {
  for (const entity of POLL_FALLBACK_ENTITIES) {
    const queryKey = buildScopedQueryKey(scope, entity);
    await queryClient.invalidateQueries({ queryKey });
  }
}

/**
 * Create MQTT-preferred realtime client with HTTP poll fallback.
 */
export function createRealtimeClient(
  options: RealtimeClientOptions,
): RealtimeClient {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const backoffCfg = options.backoff ?? DEFAULT_RECONNECT_BACKOFF;
  const schedule = options.schedule ?? defaultSchedule;
  const random = options.random ?? Math.random;

  let state: RealtimeConnectionState = "idle";
  let uxKey: RealtimeUxKey = "idle";
  let backoff: BackoffClock = resetBackoff();
  let pollTimer: SchedulerHandle | null = null;
  let reconnectTimer: SchedulerHandle | null = null;
  let unsubMessage: (() => void) | null = null;
  let unsubDisconnect: (() => void) | null = null;
  let started = false;
  let stopped = false;

  const setState = (
    next: RealtimeConnectionState,
    nextUx: RealtimeUxKey,
  ): void => {
    state = next;
    uxKey = nextUx;
    options.onStateChange?.(next);
  };

  const clearPoll = (): void => {
    pollTimer?.clear();
    pollTimer = null;
  };

  const clearReconnect = (): void => {
    reconnectTimer?.clear();
    reconnectTimer = null;
  };

  const startPollFallback = (): void => {
    if (pollTimer || stopped) return;
    setState("poll_fallback", "poll_fallback");
    const tick = (): void => {
      if (stopped) return;
      void invalidatePollFallbackEntities(
        options.queryClient,
        options.scope,
      ).finally(() => {
        if (stopped || state === "connected") {
          clearPoll();
          return;
        }
        pollTimer = schedule(tick, pollIntervalMs);
      });
    };
    pollTimer = schedule(tick, pollIntervalMs);
  };

  const scheduleReconnect = (): void => {
    if (stopped) return;
    clearReconnect();
    /**
     * Stay in poll_fallback while MQTT reconnect is pending —
     * Iranian mobile: keep lists refreshing until MQTT returns.
     */
    setState("poll_fallback", "reconnecting");
    const delay = computeReconnectDelayMs(backoff.attempt, backoffCfg, random);
    backoff = nextBackoffAttempt(backoff);
    reconnectTimer = schedule(() => {
      void connectMqtt().catch(() => {
        /* next backoff scheduled inside connectMqtt failure path */
      });
    }, delay);
  };

  const handleMessage = async (message: {
    topic: string;
    payload: string;
  }): Promise<void> => {
    const channel = extractMerchantChannelFromTopic(message.topic);
    if (!channel) return;
    await invalidateQueriesForChannel(
      options.queryClient,
      options.scope,
      channel,
    );
  };

  const connectMqtt = async (): Promise<void> => {
    if (stopped) return;
    setState(
      state === "idle" || state === "connecting" ? "connecting" : "reconnecting",
      state === "idle" || state === "connecting" ? "connecting" : "reconnecting",
    );

    try {
      const token = await options.fetchToken();
      if (token.merchantId !== options.scope.merchantId) {
        throw new Error(
          "Realtime token merchantId must match client scope (ADR-039 ACL).",
        );
      }

      unsubMessage?.();
      unsubMessage = null;

      await options.transport.connect({
        url: token.brokerUrl,
        username: token.username,
        password: token.password,
      });

      const filter =
        options.channels && options.channels.length > 0
          ? options.channels.map((channel) =>
              buildMerchantTopic({
                env: options.env,
                merchantId: options.scope.merchantId,
                channel,
              }),
            )
          : [
              buildMerchantSubscribeFilter({
                env: options.env,
                merchantId: options.scope.merchantId,
              }),
            ];

      const unsubs = filter.map((topicFilter) =>
        options.transport.subscribe(topicFilter, (msg) => {
          void handleMessage(msg);
        }),
      );
      unsubMessage = () => {
        for (const u of unsubs) u();
      };

      backoff = resetBackoff();
      clearPoll();
      clearReconnect();
      setState("connected", "connected");
    } catch {
      setState("poll_fallback", "offline");
      startPollFallback();
      scheduleReconnect();
    }
  };

  const onUnexpectedDisconnect = (): void => {
    if (stopped) return;
    unsubMessage?.();
    unsubMessage = null;
    setState("poll_fallback", "offline");
    startPollFallback();
    scheduleReconnect();
  };

  return {
    async start(): Promise<void> {
      if (started) return;
      started = true;
      stopped = false;
      unsubDisconnect = options.transport.onUnexpectedDisconnect(
        onUnexpectedDisconnect,
      );
      await connectMqtt();
    },

    async stop(): Promise<void> {
      stopped = true;
      started = false;
      clearPoll();
      clearReconnect();
      unsubMessage?.();
      unsubMessage = null;
      unsubDisconnect?.();
      unsubDisconnect = null;
      await options.transport.disconnect();
      setState("stopped", "idle");
    },

    getState(): RealtimeConnectionState {
      return state;
    },

    getUxKey(): RealtimeUxKey {
      return uxKey;
    },

    async runPollCycle(): Promise<void> {
      await invalidatePollFallbackEntities(
        options.queryClient,
        options.scope,
      );
    },
  };
}
