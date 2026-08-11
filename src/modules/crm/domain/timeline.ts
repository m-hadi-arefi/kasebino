/**
 * Unified Customer Timeline Event Domain Aggregator.
 *
 * Merges Kasbino CRM Events with ERPNext Financial Events.
 */

export type TimelineEventCategory = "CRM" | "FINANCIAL";

export type TimelineEventType =
  | "CustomerCreated"
  | "CustomerUpdated"
  | "NoteAdded"
  | "TagAdded"
  | "TagRemoved"
  | "InteractionLogged"
  | "FollowUpCreated"
  | "FollowUpCompleted"
  | "StatusChanged"
  | "InvoiceCreated"
  | "InvoiceSubmitted"
  | "PaymentReceived"
  | "ReturnCreated";

export type TimelineEvent = {
  id: string;
  category: TimelineEventCategory;
  type: TimelineEventType;
  titleFa: string;
  descriptionFa?: string;
  occurredAt: Date;
  actorName?: string;
  documentRef?: string | null;
  metadata?: Record<string, unknown>;
};

export function mergeTimelineEvents(
  crmEvents: TimelineEvent[],
  financialEvents: TimelineEvent[],
): TimelineEvent[] {
  const combined = [...crmEvents, ...financialEvents];
  return combined.sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );
}
