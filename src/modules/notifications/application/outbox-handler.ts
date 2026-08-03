/**
 * Outbox `notifications` consumer (ADR-090 / ADR-036).
 * Creates persisted in-app notifications after commit — never on critical path.
 */

import type { OutboxDispatchHandler, OutboxMessage } from "../../../outbox/index.js";
import type { NotificationsUseCases } from "./use-cases.js";

export type NotificationsOutboxHandlerOptions = {
  useCases: NotificationsUseCases;
};

/**
 * Failures throw so the outbox worker retries (at-least-once).
 * Idempotency is enforced inside createFromEnvelope via sourceEventId.
 */
export function createNotificationsOutboxHandler(
  options: NotificationsOutboxHandlerOptions,
): OutboxDispatchHandler {
  return async (message: OutboxMessage) => {
    await options.useCases.createFromEnvelope(message.envelope);
  };
}
