/**
 * MQTT browser transport port (ADR-039).
 * Production adapters use mqtt.js over WebSocket; tests use in-memory.
 */

import type { InMemoryMqttBroker } from "../emqx-realtime/index.js";

export type RealtimeMqttMessage = {
  topic: string;
  payload: string;
};

export type RealtimeMqttMessageHandler = (
  message: RealtimeMqttMessage,
) => void | Promise<void>;

export type RealtimeMqttConnectOptions = {
  /** WebSocket URL preferred for browsers (ws:// / wss://). */
  url: string;
  username: string;
  password: string;
  clientId?: string;
};

/**
 * Thin MQTT client port — no broker SDK at import time.
 */
export type RealtimeMqttTransport = {
  connect(options: RealtimeMqttConnectOptions): Promise<void>;
  subscribe(
    topicFilter: string,
    handler: RealtimeMqttMessageHandler,
  ): () => void;
  disconnect(): Promise<void>;
  /** Fires when the transport loses the broker (not on intentional disconnect). */
  onUnexpectedDisconnect(handler: () => void): () => void;
  readonly connected: boolean;
};

export type InMemoryRealtimeTransport = RealtimeMqttTransport & {
  /** Test helper: simulate broker/network drop while "connected". */
  simulateUnexpectedDisconnect(): void;
};

/**
 * In-memory transport wrapping ADR-038 `InMemoryMqttBroker` for unit tests.
 */
export function createInMemoryRealtimeTransport(
  broker: InMemoryMqttBroker,
): InMemoryRealtimeTransport {
  let connected = false;
  let intentionalDisconnect = false;
  const unexpectedHandlers = new Set<() => void>();
  const unsubscribers: Array<() => void> = [];

  const api: InMemoryRealtimeTransport = {
    get connected() {
      return connected;
    },

    async connect(options: RealtimeMqttConnectOptions): Promise<void> {
      void options;
      intentionalDisconnect = false;
      connected = true;
    },

    subscribe(
      topicFilter: string,
      handler: RealtimeMqttMessageHandler,
    ): () => void {
      if (!connected) {
        throw new Error(
          "Cannot subscribe before MQTT connect (ADR-039).",
        );
      }
      const unsub = broker.subscribe(topicFilter, (msg) => {
        void handler({ topic: msg.topic, payload: msg.payload });
      });
      unsubscribers.push(unsub);
      return unsub;
    },

    async disconnect(): Promise<void> {
      intentionalDisconnect = true;
      connected = false;
      while (unsubscribers.length > 0) {
        const unsub = unsubscribers.pop();
        unsub?.();
      }
    },

    onUnexpectedDisconnect(handler: () => void): () => void {
      unexpectedHandlers.add(handler);
      return () => {
        unexpectedHandlers.delete(handler);
      };
    },

    simulateUnexpectedDisconnect(): void {
      if (!connected || intentionalDisconnect) {
        return;
      }
      connected = false;
      while (unsubscribers.length > 0) {
        const unsub = unsubscribers.pop();
        unsub?.();
      }
      for (const h of unexpectedHandlers) {
        h();
      }
    },
  };

  return api;
}

/**
 * Derive browser MQTT-over-WebSocket URL from MQTT_URL or WS hint.
 * EMQX default WS path: `/mqtt` on the WS listener (compose :8083).
 */
export function toMqttWebSocketUrl(brokerUrl: string): string {
  const trimmed = brokerUrl.trim();
  if (!trimmed) {
    throw new Error("Broker URL is required for MQTT WebSocket (ADR-039).");
  }
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return ensureMqttWsPath(trimmed);
  }
  if (trimmed.startsWith("mqtts://")) {
    const rest = trimmed.slice("mqtts://".length);
    const host = rest.replace(/:\d+$/, "");
    return ensureMqttWsPath(`wss://${host}:8084`);
  }
  if (trimmed.startsWith("mqtt://")) {
    const rest = trimmed.slice("mqtt://".length);
    const hostPort = rest.split("/")[0] ?? rest;
    const host = hostPort.replace(/:\d+$/, "");
    /** Local compose maps EMQX WS to 8083. */
    return ensureMqttWsPath(`ws://${host}:8083`);
  }
  throw new Error(
    `Unsupported broker URL scheme for MQTT WebSocket (ADR-039): "${trimmed}"`,
  );
}

function ensureMqttWsPath(wsUrl: string): string {
  try {
    const u = new URL(wsUrl);
    if (!u.pathname || u.pathname === "/") {
      u.pathname = "/mqtt";
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    throw new Error(
      `Invalid WebSocket broker URL (ADR-039): "${wsUrl}"`,
    );
  }
}

/**
 * Connect options for a future mqtt.js adapter (not opened at import).
 */
export function buildMqttJsConnectOptions(input: {
  brokerUrl: string;
  username: string;
  password: string;
  clientId?: string;
}): RealtimeMqttConnectOptions & { protocol: "mqtt_over_websocket" } {
  return {
    protocol: "mqtt_over_websocket",
    url: toMqttWebSocketUrl(input.brokerUrl),
    username: input.username,
    password: input.password,
    ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
  };
}
