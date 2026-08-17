/**
 * ADR-068 — Environment and Secret Management contract.
 *
 * Secrets via process env / secret manager only; `.env.example` is the sole
 * committed template. Zod-free `parseEnv` validates required keys at boot
 * (migrate to Zod later without changing key names). Vault/SOPS deferred.
 *
 * Cross-ref: ADR-066 compose parity, ADR-041 DATABASE_URL, ADR-051 REDIS_URL,
 * ADR-031/033 auth (AUTH_SECRET), ADR-083/084 SMS/PSP secrets when chosen.
 */

/** Dedicated session/JWT signing secret — never reuse DB/Redis/MinIO passwords. */
export const AUTH_SECRET_ENV = "AUTH_SECRET" as const;

/** OLTP + cache connection keys (ADR-041 / ADR-051). */
export const CONNECTION_URL_ENV = {
  database: "DATABASE_URL",
  redis: "REDIS_URL",
} as const;

/**
 * Keys required for application boot when `parseEnv` runs.
 * Production fail-fast if any missing/blank.
 */
export const REQUIRED_BOOT_KEYS = [
  "NODE_ENV",
  CONNECTION_URL_ENV.database,
  CONNECTION_URL_ENV.redis,
  AUTH_SECRET_ENV,
] as const;

export type RequiredBootKey = (typeof REQUIRED_BOOT_KEYS)[number];

/**
 * Documented in `.env.example` (local parity + placeholders).
 * Includes compose data-plane keys from ADR-066 plus AUTH_SECRET.
 */
export const ENV_EXAMPLE_DOCUMENTED_KEYS = [
  "APP_PORT",
  "NODE_ENV",
  "DATABASE_URL",
  "REDIS_URL",
  "MONGODB_URL",
  "MQTT_URL",
  "MINIO_ENDPOINT",
  AUTH_SECRET_ENV,
] as const;

/**
 * Secret / credential-class keys — never commit real values.
 * `.env.example` may use obvious local-only placeholders only.
 */
export const SECRET_ENV_KEYS = [
  AUTH_SECRET_ENV,
  "POSTGRES_PASSWORD",
  "MONGO_INITDB_ROOT_PASSWORD",
  "MINIO_ROOT_PASSWORD",
  "EMQX_DASHBOARD_PASSWORD",
  /** Future — set when ADR-083 / ADR-084 Accepted and wired */
  "SMS_API_KEY",
  "PSP_API_KEY",
] as const;

/** Optional provider keys (ports until vendor ADRs Accepted). */
export const OPTIONAL_PROVIDER_SECRET_KEYS = [
  "SMS_API_KEY",
  "PSP_API_KEY",
] as const;

/**
 * Known weak / example AUTH_SECRET values rejected in production.
 * Local `.env.example` may use these placeholders.
 */
export const AUTH_SECRET_PLACEHOLDERS = [
  "change-me",
  "change-me-auth-secret",
  "changeme",
  "secret",
  "dev-secret",
  "replace-me",
] as const;

export const SECRET_POLICY = {
  commitEnvExampleOnly: true,
  neverCommitDotEnv: true,
  neverBakeSecretsInImages: true,
  authSecretSeparateFromDataPlanePasswords: true,
  secretsViaEnvOrSecretManager: true,
  vaultSopsLater: true,
  rotationProceduresDoc: "docs/deployment/environments.md",
} as const;

/**
 * Persian edge-facing copy when configuration is missing/invalid (ADR Iranian UX).
 * Technical detail stays on Error.cause / English `code` for operators.
 */
export const CONFIG_FAIL_EDGE_MESSAGES = {
  fa: "پیکربندی سامانه ناقص است. لطفاً با پشتیبانی تماس بگیرید.",
  code: "ENV_CONFIG_INVALID",
} as const;

export type NodeEnvName = "development" | "test" | "production" | "staging";

export type ParsedEnv = {
  nodeEnv: NodeEnvName;
  databaseUrl: string;
  redisUrl: string;
  authSecret: string;
  /** Raw env snapshot used for parsing (not secrets-safe for logging). */
  source: "process_env";
};

export class EnvConfigError extends Error {
  readonly code = CONFIG_FAIL_EDGE_MESSAGES.code;
  /** Merchant/operator-visible Persian message for edge surfaces. */
  readonly edgeMessageFa = CONFIG_FAIL_EDGE_MESSAGES.fa;
  readonly missingKeys: readonly string[];

  constructor(message: string, missingKeys: readonly string[] = []) {
    super(message);
    this.name = "EnvConfigError";
    this.missingKeys = missingKeys;
  }
}

export const ENV_SECRETS_REQUIREMENTS = {
  zodFreeParseEnv: true,
  requiredBootKeys: true,
  failFastMissingInProduction: true,
  authSecretSeparate: true,
  databaseUrlAndRedisUrl: true,
  envExampleOnlyCommitted: true,
  persianConfigFailAtEdge: true,
  noRealSecretsInRepo: true,
} as const;

export function isNodeEnvName(value: string): value is NodeEnvName {
  return (
    value === "development" ||
    value === "test" ||
    value === "production" ||
    value === "staging"
  );
}

export function resolveNodeEnv(
  env: NodeJS.ProcessEnv = process.env,
): NodeEnvName {
  const raw = (env.NODE_ENV ?? "development").trim();
  if (isNodeEnvName(raw)) {
    return raw;
  }
  throw new EnvConfigError(
    `NODE_ENV must be development|test|staging|production (ADR-068); got "${raw}".`,
    ["NODE_ENV"],
  );
}

export function isProductionLike(nodeEnv: NodeEnvName): boolean {
  return nodeEnv === "production" || nodeEnv === "staging";
}

function blankKeys(
  env: NodeJS.ProcessEnv,
  keys: readonly string[],
): string[] {
  return keys.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === "";
  });
}

export function isAuthSecretPlaceholder(secret: string): boolean {
  const normalized = secret.trim().toLowerCase();
  return (AUTH_SECRET_PLACEHOLDERS as readonly string[]).includes(normalized);
}

/**
 * Zod-free env parse. In production/staging: fail-fast on missing required
 * keys and reject placeholder AUTH_SECRET. Development/test: still require
 * keys when this helper is invoked (call only at intentional boot paths).
 */
export function parseEnv(env: NodeJS.ProcessEnv = process.env): ParsedEnv {
  const nodeEnv = resolveNodeEnv(env);
  const missing = blankKeys(env, REQUIRED_BOOT_KEYS);

  // Fail-fast whenever parseEnv runs (boot path). Production deploys must call it.
  if (missing.length > 0) {
    throw new EnvConfigError(
      `Missing required environment keys (ADR-068): ${missing.join(", ")}. ${CONFIG_FAIL_EDGE_MESSAGES.fa}`,
      missing,
    );
  }

  const databaseUrl = env[CONNECTION_URL_ENV.database]!.trim();
  const redisUrl = env[CONNECTION_URL_ENV.redis]!.trim();
  const authSecret = env[AUTH_SECRET_ENV]!.trim();

  if (isProductionLike(nodeEnv) && isAuthSecretPlaceholder(authSecret)) {
    throw new EnvConfigError(
      `AUTH_SECRET must not be a documented placeholder in ${nodeEnv} (ADR-068). ${CONFIG_FAIL_EDGE_MESSAGES.fa}`,
      [AUTH_SECRET_ENV],
    );
  }

  if (isProductionLike(nodeEnv) && authSecret.length < 16) {
    throw new EnvConfigError(
      `AUTH_SECRET must be at least 16 characters in ${nodeEnv} (ADR-068). ${CONFIG_FAIL_EDGE_MESSAGES.fa}`,
      [AUTH_SECRET_ENV],
    );
  }

  return {
    nodeEnv,
    databaseUrl,
    redisUrl,
    authSecret,
    source: "process_env",
  };
}

/**
 * Production-only guard for deploy smoke checks: missing required → throw.
 * No-op for development/test so local tooling can inspect incomplete shells.
 */
export function assertRequiredEnvInProduction(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const nodeEnv = resolveNodeEnv(env);
  if (!isProductionLike(nodeEnv)) {
    return;
  }
  parseEnv(env);
}

export function assertAuthSecretSeparate(
  authSecretEnvKey: string,
  dataPlanePasswordKeys: readonly string[],
): void {
  if (authSecretEnvKey !== AUTH_SECRET_ENV) {
    throw new Error(
      `Auth signing secret must use "${AUTH_SECRET_ENV}" (ADR-068); got "${authSecretEnvKey}".`,
    );
  }
  if (dataPlanePasswordKeys.includes(AUTH_SECRET_ENV)) {
    throw new Error(
      "AUTH_SECRET must not be reused as a data-plane password key (ADR-068).",
    );
  }
  if (!SECRET_POLICY.authSecretSeparateFromDataPlanePasswords) {
    throw new Error(
      "SECRET_POLICY.authSecretSeparateFromDataPlanePasswords must be true (ADR-068).",
    );
  }
}

export function assertSecretsNotCommitted(options: {
  dotEnvExistsInRepo: boolean;
  envExampleExists: boolean;
}): void {
  if (!SECRET_POLICY.commitEnvExampleOnly || !SECRET_POLICY.neverCommitDotEnv) {
    throw new Error("Secret commit policy violated in contract (ADR-068).");
  }
  if (options.dotEnvExistsInRepo) {
    throw new Error(
      ".env must not be committed; copy from .env.example (ADR-068).",
    );
  }
  if (!options.envExampleExists) {
    throw new Error(".env.example must exist as the committed template (ADR-068).");
  }
}

export function assertPersianConfigFailMessage(messageFa: string): void {
  if (messageFa !== CONFIG_FAIL_EDGE_MESSAGES.fa) {
    throw new Error(
      "Config-fail edge message must match Persian copy (ADR-068 Iranian First).",
    );
  }
  if (!/[\u0600-\u06FF]/.test(messageFa)) {
    throw new Error(
      "Config-fail edge message must contain Persian script (ADR-068).",
    );
  }
}

export const ENV_SECRETS = {
  requiredBootKeys: REQUIRED_BOOT_KEYS,
  connectionUrlEnv: CONNECTION_URL_ENV,
  authSecretEnv: AUTH_SECRET_ENV,
  envExampleDocumentedKeys: ENV_EXAMPLE_DOCUMENTED_KEYS,
  secretEnvKeys: SECRET_ENV_KEYS,
  optionalProviderSecretKeys: OPTIONAL_PROVIDER_SECRET_KEYS,
  authSecretPlaceholders: AUTH_SECRET_PLACEHOLDERS,
  secretPolicy: SECRET_POLICY,
  configFailEdgeMessages: CONFIG_FAIL_EDGE_MESSAGES,
  requirements: ENV_SECRETS_REQUIREMENTS,
} as const;
