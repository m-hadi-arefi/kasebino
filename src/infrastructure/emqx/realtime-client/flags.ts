/**
 * Browser MQTT client feature flags (ADR-124).
 * When disabled, staff surfaces stay on poll fallback only.
 */

export type MqttClientEnv = {
  NEXT_PUBLIC_MOS_MQTT_CLIENT?: string | undefined;
  MOS_MQTT_CLIENT?: string | undefined;
  NEXT_PUBLIC_MOS_ENV?: string | undefined;
  MOS_ENV?: string | undefined;
  NODE_ENV?: string | undefined;
  [key: string]: string | undefined;
};

/**
 * `NEXT_PUBLIC_MOS_MQTT_CLIENT=0|false|off|disabled|poll` forces poll-only mode.
 * Default: MQTT client enabled (Compose EMQX / token mint path).
 */
export function isMqttClientEnabled(
  env: MqttClientEnv = process.env as MqttClientEnv,
): boolean {
  const raw =
    env.NEXT_PUBLIC_MOS_MQTT_CLIENT?.trim() ||
    env.MOS_MQTT_CLIENT?.trim() ||
    "";
  const v = raw.toLowerCase();
  if (
    v === "0" ||
    v === "false" ||
    v === "off" ||
    v === "disabled" ||
    v === "poll"
  ) {
    return false;
  }
  return true;
}

/** Public env for topic env segment when browser cannot read MOS_ENV. */
export function resolveBrowserRealtimeEnv(
  env: MqttClientEnv = process.env as MqttClientEnv,
): string {
  return (
    env.NEXT_PUBLIC_MOS_ENV?.trim() ||
    env.MOS_ENV?.trim() ||
    (env.NODE_ENV === "production" ? "production" : "local")
  );
}
