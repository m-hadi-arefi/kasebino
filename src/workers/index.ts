/**
 * ADR-109 worker package exports (tests / composition).
 */

export {
  CollectingOutboxMetrics,
  createOutboxWorkerRuntime,
  type OutboxWorkerRuntime,
  type OutboxWorkerRuntimeOptions,
} from "./create-outbox-runtime.js";
