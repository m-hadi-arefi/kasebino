/**
 * Integration observability + metrics names (ADR-126).
 * In-process counters until ADR-116 OTEL runtime.
 */

export const INTEGRATION_METRIC_NAMES = {
  created: "integration.event.created",
  processing: "integration.event.processing",
  success: "integration.event.success",
  retry: "integration.event.retry",
  failed: "integration.event.failed",
  deadLetter: "integration.event.dead_letter",
} as const;

export type IntegrationMetricName =
  (typeof INTEGRATION_METRIC_NAMES)[keyof typeof INTEGRATION_METRIC_NAMES];

export type IntegrationLogFields = {
  merchant_id: string;
  store_id?: string | null;
  event_id: string;
  entity_id?: string | null;
  event_type: string;
  provider: string;
  attempt: number;
};

const counters = new Map<string, number>();

export function recordIntegrationMetric(
  name: IntegrationMetricName,
  fields: IntegrationLogFields,
): void {
  const key = `${name}:${fields.provider}:${fields.event_type}`;
  counters.set(key, (counters.get(key) ?? 0) + 1);
  if (process.env.MOS_INTEGRATION_LOG === "1") {
    console.info(
      JSON.stringify({
        msg: name,
        merchant_id: fields.merchant_id,
        store_id: fields.store_id ?? null,
        event_id: fields.event_id,
        entity_id: fields.entity_id ?? null,
        event_type: fields.event_type,
        provider: fields.provider,
        attempt: fields.attempt,
      }),
    );
  }
}

export function snapshotIntegrationMetrics(): Record<string, number> {
  return Object.fromEntries(counters.entries());
}

export function resetIntegrationMetrics(): void {
  counters.clear();
}
