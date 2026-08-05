/**
 * ADR-112 — Readiness probe helpers (`GET /api/ready`).
 *
 * Critical: Postgres + Redis. Optional (env-requireable): Mongo, EMQX, MinIO.
 */

export {
  READY_CHECK_NAMES,
  READY_CHECK_TIMEOUT_MS,
  READY_OVERALL_TIMEOUT_MS,
  READY_REQUIRE_ENV,
  assertNoSecretsInReadinessBody,
  evaluateReadiness,
  resolveRequiredChecks,
  type ReadyCheckDetail,
  type ReadyCheckName,
  type ReadyCheckResult,
  type ReadinessReport,
  type ReadinessStatus,
} from "./policy.js";
export { pingEmqxFromEnv } from "./ping-emqx.js";
export { pingPostgresFromEnv } from "./ping-postgres.js";
export {
  readinessHttpStatus,
  runReadinessChecks,
  type ReadyPingFns,
  type RunReadinessOptions,
} from "./run-checks.js";
export { ProbeTimeoutError, withTimeout } from "./timeout.js";
