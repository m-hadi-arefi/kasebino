/**
 * Browser/Node mqtt.js transport for MQTT-over-WebSocket (ADR-124 / ADR-039).
 * Reconnect is owned by createRealtimeClient — transport reconnectPeriod=0.
 */

import mqtt, { type MqttClient } from "mqtt";

import type {
  RealtimeMqttConnectOptions,
  RealtimeMqttMessageHandler,
  RealtimeMqttTransport,
} from "./transport.js";

export type MqttJsRealtimeTransportOptions = {
  connectTimeoutMs?: number;
};

/**
 * Live mqtt.js client implementing RealtimeMqttTransport.
 */
export function createMqttJsRealtimeTransport(
  options: MqttJsRealtimeTransportOptions = {},
): RealtimeMqttTransport {
  const connectTimeoutMs = options.connectTimeoutMs ?? 10_000;
  let client: MqttClient | null = null;
  let intentionalDisconnect = false;
  const unexpectedHandlers = new Set<() => void>();
  const topicHandlers = new Map<string, Set<RealtimeMqttMessageHandler>>();

  const notifyUnexpected = (): void => {
    if (intentionalDisconnect) return;
    for (const h of unexpectedHandlers) {
      h();
    }
  };

  return {
    get connected() {
      return client?.connected === true;
    },

    async connect(connectOptions: RealtimeMqttConnectOptions): Promise<void> {
      intentionalDisconnect = false;
      if (client) {
        client.removeAllListeners();
        client.end(true);
        client = null;
      }

      const next = mqtt.connect(connectOptions.url, {
        username: connectOptions.username,
        password: connectOptions.password,
        ...(connectOptions.clientId !== undefined
          ? { clientId: connectOptions.clientId }
          : {}),
        protocolVersion: 4,
        reconnectPeriod: 0,
        clean: true,
        connectTimeout: connectTimeoutMs,
      });

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          next.removeAllListeners();
          next.end(true);
          reject(new Error("MQTT connect timeout (ADR-124)."));
        }, connectTimeoutMs);

        next.once("connect", () => {
          clearTimeout(timer);
          resolve();
        });
        next.once("error", (err) => {
          clearTimeout(timer);
          reject(err instanceof Error ? err : new Error(String(err)));
        });
      });

      next.on("close", () => {
        notifyUnexpected();
      });
      next.on("offline", () => {
        notifyUnexpected();
      });
      next.on("message", (topic, payload) => {
        const text = payload.toString("utf8");
        for (const [filter, set] of topicHandlers) {
          if (!topicMatchesFilter(topic, filter)) continue;
          for (const h of set) {
            void h({ topic, payload: text });
          }
        }
      });

      client = next;
    },

    subscribe(
      topicFilter: string,
      handler: RealtimeMqttMessageHandler,
    ): () => void {
      if (!client?.connected) {
        throw new Error("Cannot subscribe before MQTT connect (ADR-124).");
      }
      let set = topicHandlers.get(topicFilter);
      if (!set) {
        set = new Set();
        topicHandlers.set(topicFilter, set);
        client.subscribe(topicFilter, { qos: 1 });
      }
      set.add(handler);
      return () => {
        set?.delete(handler);
        if (set && set.size === 0) {
          topicHandlers.delete(topicFilter);
          client?.unsubscribe(topicFilter);
        }
      };
    },

    async disconnect(): Promise<void> {
      intentionalDisconnect = true;
      topicHandlers.clear();
      const c = client;
      client = null;
      if (!c) return;
      await new Promise<void>((resolve) => {
        c.end(false, {}, () => resolve());
      });
    },

    onUnexpectedDisconnect(handler: () => void): () => void {
      unexpectedHandlers.add(handler);
      return () => {
        unexpectedHandlers.delete(handler);
      };
    },
  };
}

/** Minimal MQTT filter match for `#` / `+` (merchant `#` filters). */
export function topicMatchesFilter(topic: string, filter: string): boolean {
  if (filter === topic) return true;
  const topicParts = topic.split("/");
  const filterParts = filter.split("/");
  for (let i = 0; i < filterParts.length; i += 1) {
    const f = filterParts[i];
    if (f === "#") return true;
    const t = topicParts[i];
    if (t === undefined) return false;
    if (f === "+") continue;
    if (f !== t) return false;
  }
  return topicParts.length === filterParts.length;
}
