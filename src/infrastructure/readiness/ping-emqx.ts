/**
 * EMQX / MQTT broker ping for readiness (ADR-112 / ADR-038).
 * Connect-only check — no publish (cheap probe).
 */

import mqtt from "mqtt";

import { CONNECTION } from "../emqx/contracts/index.js";

/**
 * Ping MQTT broker via MQTT_URL. Returns false when URL missing or connect fails.
 */
export async function pingEmqxFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 1_500,
): Promise<boolean> {
  const url = env[CONNECTION.urlEnv]?.trim();
  if (!url) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        client.end(true);
      } catch {
        /* ignore */
      }
      resolve(ok);
    };

    const client = mqtt.connect(url, {
      connectTimeout: timeoutMs,
      reconnectPeriod: 0,
      clientId: `mos-ready-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
      ...(env.MQTT_USERNAME?.trim()
        ? { username: env.MQTT_USERNAME.trim() }
        : {}),
      ...(env.MQTT_PASSWORD !== undefined && env.MQTT_PASSWORD !== ""
        ? { password: env.MQTT_PASSWORD }
        : {}),
    });

    const timer = setTimeout(() => finish(false), timeoutMs);
    client.once("connect", () => finish(true));
    client.once("error", () => finish(false));
  });
}
