/**
 * MQTT channel vocabulary (ADR-038) — safe for browser imports.
 * Keep free of Node built-ins (node:crypto used by emqx-realtime barrel).
 */

export const MERCHANT_TOPIC_CHANNELS = [
  "sales",
  "orders",
  "inventory",
  "customers",
  "loyalty",
  "dashboard",
  "notifications",
] as const;

export type MerchantTopicChannel = (typeof MERCHANT_TOPIC_CHANNELS)[number];

export const ADMIN_TOPIC_CHANNELS = ["merchants", "monitoring"] as const;

export type AdminTopicChannel = (typeof ADMIN_TOPIC_CHANNELS)[number];

export type TopicKind = "merchant" | "admin";
