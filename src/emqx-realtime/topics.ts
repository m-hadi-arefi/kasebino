/**
 * MQTT topic builders + channel vocabulary (ADR-038) — browser-safe.
 * Do not import node:crypto or server-only deps here.
 */

import {
  ADMIN_TOPIC_CHANNELS,
  MERCHANT_TOPIC_CHANNELS,
  type AdminTopicChannel,
  type MerchantTopicChannel,
} from "./channels.js";

export {
  ADMIN_TOPIC_CHANNELS,
  MERCHANT_TOPIC_CHANNELS,
  type AdminTopicChannel,
  type MerchantTopicChannel,
  type TopicKind,
} from "./channels.js";

/** Topic prefix / layout — docs/architecture/08 + 17. */
export const TOPIC_LAYOUT_CORE = {
  prefix: "mos",
  separator: "/",
  /** mos/{env}/merchant/{merchantId}/{channel} */
  merchantPattern: "mos/{env}/merchant/{merchantId}/{channel}",
  /** mos/{env}/admin/{channel} */
  adminPattern: "mos/{env}/admin/{channel}",
  merchantIdRequired: true,
} as const;

export function buildMerchantTopic(parts: {
  env: string;
  merchantId: string;
  channel: MerchantTopicChannel;
}): string {
  const env = parts.env.trim();
  const merchantId = parts.merchantId.trim();
  if (!env) {
    throw new Error("MQTT topic requires env segment (ADR-038).");
  }
  if (!merchantId) {
    throw new Error(
      "MQTT merchant topic requires merchantId (ADR-038 / ADR-048).",
    );
  }
  if (!(MERCHANT_TOPIC_CHANNELS as readonly string[]).includes(parts.channel)) {
    throw new Error(
      `Unknown merchant MQTT channel "${parts.channel}" (ADR-038).`,
    );
  }
  return `${TOPIC_LAYOUT_CORE.prefix}/${env}/merchant/${merchantId}/${parts.channel}`;
}

export function buildAdminTopic(parts: {
  env: string;
  channel: AdminTopicChannel;
}): string {
  const env = parts.env.trim();
  if (!env) {
    throw new Error("MQTT topic requires env segment (ADR-038).");
  }
  if (!(ADMIN_TOPIC_CHANNELS as readonly string[]).includes(parts.channel)) {
    throw new Error(
      `Unknown admin MQTT channel "${parts.channel}" (ADR-038).`,
    );
  }
  return `${TOPIC_LAYOUT_CORE.prefix}/${env}/admin/${parts.channel}`;
}

/** Wildcard subscribe filter for one merchant under an env. */
export function buildMerchantSubscribeFilter(parts: {
  env: string;
  merchantId: string;
}): string {
  const env = parts.env.trim();
  const merchantId = parts.merchantId.trim();
  if (!env || !merchantId) {
    throw new Error(
      "Merchant subscribe filter requires env + merchantId (ADR-038).",
    );
  }
  return `${TOPIC_LAYOUT_CORE.prefix}/${env}/merchant/${merchantId}/#`;
}
