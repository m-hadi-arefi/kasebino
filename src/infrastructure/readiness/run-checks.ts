/**
 * ADR-112 — run parallel dependency probes and build readiness report.
 */

import { pingMinioFromEnv } from "../minio/index.js";
import { pingMongoFromEnv } from "../mongodb/index.js";
import { pingRedisFromEnv } from "../redis/index.js";
import { pingEmqxFromEnv } from "./ping-emqx.js";
import { pingPostgresFromEnv } from "./ping-postgres.js";
import {
  READY_CHECK_NAMES,
  READY_CHECK_TIMEOUT_MS,
  evaluateReadiness,
  resolveRequiredChecks,
  type ReadyCheckDetail,
  type ReadyCheckName,
  type ReadyCheckResult,
  type ReadinessReport,
} from "./policy.js";
import { ProbeTimeoutError, withTimeout } from "./timeout.js";

export type ReadyPingFns = {
  postgres: (env: NodeJS.ProcessEnv) => Promise<boolean>;
  redis: (env: NodeJS.ProcessEnv) => Promise<boolean>;
  mongodb: (env: NodeJS.ProcessEnv) => Promise<boolean>;
  emqx: (env: NodeJS.ProcessEnv) => Promise<boolean>;
  minio: (env: NodeJS.ProcessEnv) => Promise<boolean>;
};

export type RunReadinessOptions = {
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  pings?: Partial<ReadyPingFns>;
  /** Override "config present?" for skip decisions (tests). */
  hasConfig?: Partial<Record<ReadyCheckName, boolean>>;
};

const DEFAULT_PINGS: ReadyPingFns = {
  postgres: (env) => pingPostgresFromEnv(env),
  redis: (env) => pingRedisFromEnv(env),
  mongodb: (env) => pingMongoFromEnv(env),
  emqx: (env) => pingEmqxFromEnv(env),
  minio: (env) => pingMinioFromEnv(env),
};

function configPresent(
  name: ReadyCheckName,
  env: NodeJS.ProcessEnv,
  override?: boolean,
): boolean {
  if (override !== undefined) return override;
  switch (name) {
    case "postgres":
      return Boolean(env.DATABASE_URL?.trim());
    case "redis":
      return Boolean(env.REDIS_URL?.trim());
    case "mongodb":
      return Boolean(env.MONGODB_URL?.trim());
    case "emqx":
      return Boolean(env.MQTT_URL?.trim());
    case "minio":
      return Boolean(env.MINIO_ENDPOINT?.trim());
    default:
      return false;
  }
}

async function runOneCheck(input: {
  name: ReadyCheckName;
  required: boolean;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  ping: (env: NodeJS.ProcessEnv) => Promise<boolean>;
  hasConfig: boolean;
}): Promise<ReadyCheckResult> {
  const { name, required, env, timeoutMs, ping, hasConfig } = input;

  if (!hasConfig) {
    if (required) {
      return {
        ok: false,
        required,
        detail: "missing_config",
      };
    }
    return {
      ok: true,
      required,
      skipped: true,
    };
  }

  const started = Date.now();
  try {
    const ok = await withTimeout(ping(env), timeoutMs, name);
    const latencyMs = Date.now() - started;
    if (ok) {
      return { ok: true, required, latencyMs };
    }
    return {
      ok: false,
      required,
      latencyMs,
      detail: "unreachable",
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const detail: ReadyCheckDetail =
      err instanceof ProbeTimeoutError ? "timeout" : "unreachable";
    return {
      ok: false,
      required,
      latencyMs,
      detail,
    };
  }
}

/**
 * Probe all documented dependencies. Never throws — always returns a report.
 */
export async function runReadinessChecks(
  options: RunReadinessOptions = {},
): Promise<ReadinessReport> {
  try {
    const env = options.env ?? process.env;
    const timeoutMs = options.timeoutMs ?? READY_CHECK_TIMEOUT_MS;
    const required = resolveRequiredChecks(env);
    const pings: ReadyPingFns = { ...DEFAULT_PINGS, ...options.pings };

    const settled = await Promise.all(
      READY_CHECK_NAMES.map((name) =>
        runOneCheck({
          name,
          required: required[name],
          env,
          timeoutMs,
          ping: pings[name],
          hasConfig: configPresent(name, env, options.hasConfig?.[name]),
        }),
      ),
    );

    const checks = Object.fromEntries(
      READY_CHECK_NAMES.map((name, i) => [name, settled[i]!]),
    ) as Record<ReadyCheckName, ReadyCheckResult>;

    return {
      status: evaluateReadiness(checks),
      checks,
    };
  } catch {
    // Fail closed if the orchestrator itself blows up.
    const required = resolveRequiredChecks(options.env ?? process.env);
    const checks = Object.fromEntries(
      READY_CHECK_NAMES.map((name) => [
        name,
        {
          ok: false,
          required: required[name],
          detail: "unreachable" as const,
        },
      ]),
    ) as Record<ReadyCheckName, ReadyCheckResult>;
    return { status: "not_ready", checks };
  }
}

/** HTTP status for a readiness report. */
export function readinessHttpStatus(report: ReadinessReport): 200 | 503 {
  return report.status === "ready" ? 200 : 503;
}
