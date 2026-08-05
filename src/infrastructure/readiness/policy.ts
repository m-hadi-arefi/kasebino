/**
 * ADR-112 readiness policy — critical vs optional dependency checks.
 */

export const READY_CHECK_NAMES = [
  "postgres",
  "redis",
  "mongodb",
  "emqx",
  "minio",
] as const;

export type ReadyCheckName = (typeof READY_CHECK_NAMES)[number];

export type ReadyCheckDetail =
  | "unreachable"
  | "missing_config"
  | "timeout";

export type ReadyCheckResult = {
  ok: boolean;
  required: boolean;
  latencyMs?: number;
  skipped?: boolean;
  detail?: ReadyCheckDetail;
};

export type ReadinessStatus = "ready" | "not_ready";

export type ReadinessReport = {
  status: ReadinessStatus;
  checks: Record<ReadyCheckName, ReadyCheckResult>;
};

/** Default per-check timeout (ms). */
export const READY_CHECK_TIMEOUT_MS = 1_500;

/** Overall wall budget for parallel probes (ms). */
export const READY_OVERALL_TIMEOUT_MS = 3_000;

export const READY_REQUIRE_ENV = {
  mongodb: "MOS_READY_REQUIRE_MONGO",
  emqx: "MOS_READY_REQUIRE_EMQX",
  minio: "MOS_READY_REQUIRE_MINIO",
} as const;

function envFlagTrue(env: NodeJS.ProcessEnv, key: string): boolean {
  const raw = env[key]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Critical deps always required. Optional deps required only when env-gated. */
export function resolveRequiredChecks(
  env: NodeJS.ProcessEnv = process.env,
): Record<ReadyCheckName, boolean> {
  return {
    postgres: true,
    redis: true,
    mongodb: envFlagTrue(env, READY_REQUIRE_ENV.mongodb),
    emqx: envFlagTrue(env, READY_REQUIRE_ENV.emqx),
    minio: envFlagTrue(env, READY_REQUIRE_ENV.minio),
  };
}

export function evaluateReadiness(
  checks: Record<ReadyCheckName, ReadyCheckResult>,
): ReadinessStatus {
  for (const name of READY_CHECK_NAMES) {
    const check = checks[name];
    if (check.required && !check.ok) {
      return "not_ready";
    }
  }
  return "ready";
}

/**
 * Hard guard: readiness JSON must never echo connection strings / passwords.
 */
export function assertNoSecretsInReadinessBody(body: string): void {
  const lower = body.toLowerCase();
  const forbidden = [
    "postgres://",
    "postgresql://",
    "redis://",
    "rediss://",
    "mongodb://",
    "mongodb+srv://",
    "mqtt://",
    "mqtts://",
    "password=",
    "secret=",
    "minioadmin",
    "merchantos:merchantos",
  ];
  for (const token of forbidden) {
    if (lower.includes(token)) {
      throw new Error(
        `Readiness response must not expose credentials/URLs (found "${token}").`,
      );
    }
  }
}
