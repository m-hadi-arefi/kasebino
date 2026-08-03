/**
 * In-memory MQTT broker for unit tests (ADR-038).
 * Does not open network sockets; simulates QoS1 publish + topic filters.
 */

import type {
  EmqxBrokerPort,
  EmqxPublishInput,
  EmqxSubscribeHandler,
  MqttQos,
} from "./port.js";

type Subscription = {
  filter: string;
  handler: EmqxSubscribeHandler;
};

function topicMatchesFilter(topic: string, filter: string): boolean {
  if (filter === topic) return true;
  const filterParts = filter.split("/");
  const topicParts = topic.split("/");

  for (let i = 0; i < filterParts.length; i += 1) {
    const f = filterParts[i];
    if (f === "#") {
      return i === filterParts.length - 1;
    }
    const t = topicParts[i];
    if (t === undefined) return false;
    if (f === "+") continue;
    if (f !== t) return false;
  }
  return filterParts.length === topicParts.length;
}

/**
 * Test double: pub/sub with MQTT-style + / # filters.
 */
export class InMemoryMqttBroker implements EmqxBrokerPort {
  private readonly subscriptions: Subscription[] = [];
  readonly published: EmqxPublishInput[] = [];

  async publish(input: EmqxPublishInput): Promise<void> {
    const qos: MqttQos = input.qos ?? 1;
    const record: EmqxPublishInput = {
      topic: input.topic,
      payload: input.payload,
      qos,
      ...(input.retain !== undefined ? { retain: input.retain } : {}),
    };
    this.published.push(record);

    for (const sub of this.subscriptions) {
      if (topicMatchesFilter(input.topic, sub.filter)) {
        await sub.handler({
          topic: input.topic,
          payload: input.payload,
          qos,
        });
      }
    }
  }

  subscribe(topicFilter: string, handler: EmqxSubscribeHandler): () => void {
    const trimmed = topicFilter.trim();
    if (!trimmed) {
      throw new Error("MQTT topic filter must be non-empty (ADR-038).");
    }
    const sub: Subscription = { filter: trimmed, handler };
    this.subscriptions.push(sub);
    return () => {
      const idx = this.subscriptions.indexOf(sub);
      if (idx >= 0) this.subscriptions.splice(idx, 1);
    };
  }
}
