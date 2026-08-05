/**
 * EMQX / MQTT connection config (ADR-038 / ADR-109).
 *
 * Resolves MQTT_URL for infrastructure layers. Does not open a broker
 * connection at import time. Live publish → `MqttJsEmqxPublisher`
 * (`mqtt-publisher.ts`). Browser subscribe strategy: `src/realtime-client`
 * (ADR-039).
 */

import { CONNECTION } from "../../emqx-realtime/index.js";

export type EmqxConnectionConfig = {
  url: string;
  envVar: typeof CONNECTION.urlEnv;
};

/** MOS_MQTT_MODE=memory|live — memory uses InMemoryMqttBroker in worker. */
export type MqttRuntimeMode = "memory" | "live";

export function resolveMqttRuntimeMode(
  env: NodeJS.ProcessEnv = process.env,
): MqttRuntimeMode {
  const raw = env.MOS_MQTT_MODE?.trim().toLowerCase();
  if (raw === "memory" || raw === "mock") return "memory";
  if (raw === "live") return "live";
  // Default live when MQTT_URL present; otherwise memory for unit tests.
  return env.MQTT_URL?.trim() ? "live" : "memory";
}

/**
 * Resolve MQTT broker URL from an explicit value (tests / DI).
 */
export function createEmqxConfig(url: string): EmqxConnectionConfig {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error(
      `${CONNECTION.urlEnv} must be a non-empty MQTT URL (ADR-038).`,
    );
  }
  const schemeOk = CONNECTION.schemeHints.some((s) => trimmed.startsWith(s));
  if (!schemeOk) {
    throw new Error(
      `${CONNECTION.urlEnv} must use mqtt://, mqtts://, ws://, or wss:// (ADR-038); got "${trimmed}".`,
    );
  }
  return {
    url: trimmed,
    envVar: CONNECTION.urlEnv,
  };
}

/**
 * Build EMQX connection config from process env. Requires MQTT_URL.
 */
export function createEmqxConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): EmqxConnectionConfig {
  const url = env[CONNECTION.urlEnv];
  if (!url) {
    throw new Error(
      `${CONNECTION.urlEnv} is required for the EMQX client stub (ADR-038).`,
    );
  }
  return createEmqxConfig(url);
}
