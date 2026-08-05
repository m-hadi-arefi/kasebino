/**
 * Live mqtt.js EMQX publisher (ADR-109 / ADR-038).
 * Implements EmqxPublishPort; keeps connection lazy until first publish.
 */

import mqtt, { type MqttClient } from "mqtt";

import type { EmqxPublishInput, EmqxPublishPort, MqttQos } from "../../emqx-realtime/port.js";
import { PUBLISH_QOS } from "../../emqx-realtime/index.js";
import {
  createEmqxConfig,
  createEmqxConfigFromEnv,
  type EmqxConnectionConfig,
} from "./client.js";

export type MqttJsEmqxPublisherOptions = {
  url: string;
  username?: string;
  password?: string;
  clientId?: string;
  /** Default QoS when publish input omits qos (ADR-038 = 1). */
  defaultQos?: MqttQos;
  connectTimeoutMs?: number;
};

/**
 * QoS1 MQTT publisher backed by mqtt.js against Compose/live EMQX.
 */
export class MqttJsEmqxPublisher implements EmqxPublishPort {
  private client: MqttClient | null = null;
  private connecting: Promise<MqttClient> | null = null;
  private readonly defaultQos: MqttQos;
  private readonly connectTimeoutMs: number;

  constructor(private readonly options: MqttJsEmqxPublisherOptions) {
    this.defaultQos = options.defaultQos ?? PUBLISH_QOS;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 10_000;
  }

  static fromConfig(
    config: EmqxConnectionConfig,
    extras?: Omit<MqttJsEmqxPublisherOptions, "url">,
  ): MqttJsEmqxPublisher {
    return new MqttJsEmqxPublisher({
      url: config.url,
      ...extras,
    });
  }

  static fromEnv(
    env: NodeJS.ProcessEnv = process.env,
    extras?: Omit<MqttJsEmqxPublisherOptions, "url">,
  ): MqttJsEmqxPublisher {
    return MqttJsEmqxPublisher.fromConfig(createEmqxConfigFromEnv(env), extras);
  }

  async publish(input: EmqxPublishInput): Promise<void> {
    const client = await this.ensureConnected();
    const qos = input.qos ?? this.defaultQos;
    await new Promise<void>((resolve, reject) => {
      client.publish(
        input.topic,
        input.payload,
        {
          qos,
          retain: input.retain ?? false,
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  async close(): Promise<void> {
    const client = this.client;
    this.client = null;
    this.connecting = null;
    if (!client) return;
    await new Promise<void>((resolve) => {
      client.end(false, {}, () => resolve());
    });
  }

  private async ensureConnected(): Promise<MqttClient> {
    if (this.client?.connected) return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<MqttClient>((resolve, reject) => {
      const client = mqtt.connect(this.options.url, {
        clientId:
          this.options.clientId ??
          `mos-outbox-${process.pid}-${Math.random().toString(36).slice(2, 10)}`,
        ...(this.options.username !== undefined
          ? { username: this.options.username }
          : {}),
        ...(this.options.password !== undefined
          ? { password: this.options.password }
          : {}),
        clean: true,
        reconnectPeriod: 1_000,
        connectTimeout: this.connectTimeoutMs,
      });

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const onConnect = () => {
        cleanup();
        this.client = client;
        resolve(client);
      };
      const cleanup = () => {
        client.off("connect", onConnect);
        client.off("error", onError);
      };

      client.once("connect", onConnect);
      client.once("error", onError);
    }).finally(() => {
      this.connecting = null;
    });

    return this.connecting;
  }
}

/** Resolve MQTT URL helper for composition (re-export convenience). */
export { createEmqxConfig, createEmqxConfigFromEnv };
