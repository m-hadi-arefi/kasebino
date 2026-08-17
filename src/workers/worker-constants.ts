/**
 * Shared worker constants (keeps entrypoint free of heavy barrel churn).
 */

export { OUTBOX_POLL, OUTBOX_WORKER_UX_FA } from "../events/outbox/index.js";

export const scrubEnvelopeForLogsHint = "[scrubbed]" as const;
