/**
 * ADR-038 — EMQX publish port (MQTT realtime fan-out).
 *
 * Real mqtt.js / EMQX SDK adapters implement this port.
 * Prefer module-owned adapters; tests use InMemoryMqttBroker.
 */

export type MqttQos = 0 | 1 | 2;

export type EmqxPublishInput = {
  topic: string;
  /** Canonical event envelope JSON (or lean payload string). */
  payload: string;
  qos?: MqttQos;
  retain?: boolean;
};

export type EmqxPublishPort = {
  publish(input: EmqxPublishInput): Promise<void>;
};

export type EmqxSubscribeHandler = (message: {
  topic: string;
  payload: string;
  qos: MqttQos;
}) => void | Promise<void>;

/** Extended port for in-memory broker / future adapters that also subscribe. */
export type EmqxBrokerPort = EmqxPublishPort & {
  subscribe(
    topicFilter: string,
    handler: EmqxSubscribeHandler,
  ): () => void;
};
