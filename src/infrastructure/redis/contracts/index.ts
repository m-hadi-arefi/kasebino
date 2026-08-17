/**
 * ADR-051 — Redis Architecture contract.
 *
 * Shared Redis for cache-aside and rate limiting across multi-instance apps.
 * Redis is never a source of truth — PostgreSQL remains OLTP SoT.
 *
 * Cache-aside helpers → `src/infrastructure/redis/cache-aside` (ADR-052).
 * Key/TTL standards → `src/infrastructure/redis/cache-keys` (ADR-053).
 * Invalidation event→key maps → `src/infrastructure/redis/cache-invalidation` (ADR-054).
 * Rate-limit package → `src/infrastructure/security/rate-limiting` (ADR-055).
 *
 * Normative prose: docs/tech/redis.md, docs/architecture/07-cache-architecture.md,
 * docs/architecture/18-failure-recovery-architecture.md
 */

import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_SERVICE_PORTS,
} from "../../../shared/contracts/docker-compose-parity/index.js";

/** Engine identity — shared cache / rate-limit plane (compose pins Redis 7). */
export const REDIS_ENGINE = {
  name: "redis",
  role: "cache_aside_and_rate_limit",
  plane: "cache",
  channel: "latest_stable",
  /** Local parity image major from ADR-066 compose. */
  composeImageMajor: 7,
  composePort: COMPOSE_SERVICE_PORTS.redis[0],
  soleSourceOfTruth: false,
  neverSourceOfTruth: true,
} as const;

/**
 * Forbidden Redis usages — Redis must not replace PostgreSQL OLTP.
 */
export const FORBIDDEN_REDIS = {
  asOltpSourceOfTruth: false,
  asMoneyStockSot: false,
  asMembershipSot: false,
  flushDbInApp: false,
  inProcessOnlyForTenantBusinessData: false,
} as const;

/** Connection — all envs use REDIS_URL (ADR-066 compose + .env.example). */
export const CONNECTION = {
  envVar: "REDIS_URL",
  documentedIn: [COMPOSE_FILES.envExample, COMPOSE_FILES.compose] as const,
  /** Optional host/port split keys also documented for local tooling. */
  optionalHostPortKeys: ["REDIS_HOST", "REDIS_PORT"] as const,
  scheme: "redis://",
} as const;

/**
 * Key namespace — canonical builders + TTL table in `src/infrastructure/redis/cache-keys` (ADR-053).
 * Business keys must include merchantId (ADR-048 / cache rules).
 */
export const KEY_NAMESPACE = {
  prefix: "mos",
  separator: ":",
  /** mos:{env}:m:{merchantId}:… — `src/infrastructure/redis/cache-keys` (ADR-053) */
  highLevelPattern: "mos:{env}:m:{merchantId}:{domain}:{resource}:{id}",
  merchantIdRequiredInBusinessKeys: true,
  detailAdr: "ADR-053",
  implementation: "src/infrastructure/redis/cache-keys/",
  strategyDoc: "docs/architecture/cache-strategy.md",
} as const;

/**
 * Failure-mode notes when Redis is unavailable.
 * Rate-limit enforcement: `src/infrastructure/security/rate-limiting` (ADR-055);
 * cache-aside helpers: `src/infrastructure/redis/cache-aside` (ADR-052).
 *
 * From docs/architecture/18-failure-recovery-architecture.md:
 * bypass cache → DB (degraded); fail closed on auth rate-limit when policy requires.
 */
export const FAILURE_MODES = {
  cacheReads: {
    policy: "fail_open",
    behavior: "bypass_cache_to_postgresql",
    detailAdr: "ADR-052",
  },
  authAndOtpRateLimits: {
    policy: "fail_closed",
    behavior: "deny_when_redis_unavailable",
    detailAdr: "ADR-055",
    implementation: "src/infrastructure/security/rate-limiting",
    rationale: "Iranian SMS OTP abuse protection",
  },
  generalRateLimits: {
    policy: "fail_open",
    detailAdr: "ADR-055",
    implementation: "src/infrastructure/security/rate-limiting",
    note: "public_storefront_and_default_fail_open",
  },
  recoveryDoc: "docs/architecture/18-failure-recovery-architecture.md",
} as const;

/**
 * Iranian First — cached payloads may hold Persian (fa) strings.
 * Keys stay ID-based; serializers must not corrupt Unicode.
 */
export const UNICODE_VALUE_SAFETY = {
  preserveUtf8PersianInValues: true,
  keysRemainIdBased: true,
  noAsciiScrubOfCachedFaText: true,
} as const;

/** Where Redis access lives — thin stub + rate-limit + cache packages. */
export const DEFERRED_PLACEMENT = {
  architectureContract: "src/infrastructure/redis/contracts/",
  clientStub: "src/infrastructure/redis/client.ts",
  techFolderConvention: "src/shared/infrastructure/redis",
  rateLimitPackage: "src/infrastructure/security/rate-limiting/",
  cacheAsidePackage: "src/infrastructure/redis/cache-aside/",
  cacheKeysPackage: "src/infrastructure/redis/cache-keys/",
  cacheInvalidationPackage: "src/infrastructure/redis/cache-invalidation/",
  cacheAsideAdr: "ADR-052",
  keysTtlAdr: "ADR-053",
  invalidationAdr: "ADR-054",
  rateLimitAdr: "ADR-055",
} as const;

export const REDIS_REQUIREMENTS = {
  sharedAcrossInstances: true,
  cacheAsideAndRateLimit: true,
  neverSourceOfTruth: true,
  connectViaRedisUrl: true,
  /** Key/TTL standards realized in ADR-053 `src/infrastructure/redis/cache-keys`. */
  keyNamespaceDefer053: false,
  keysTtlImplementedAdr053: true,
  /** Fail policies realized in ADR-055 `src/infrastructure/security/rate-limiting`. */
  failPolicyNotesDefer055: false,
  rateLimitImplementedAdr055: true,
  /** Cache-aside helpers realized in ADR-052 `src/infrastructure/redis/cache-aside`. */
  noCacheAsideInThisAdr: false,
  cacheAsideImplementedAdr052: true,
  /** Event→key invalidation realized in ADR-054 `src/infrastructure/redis/cache-invalidation`. */
  invalidationDefer054: false,
  invalidationImplementedAdr054: true,
  /** Next.js middleware/route matrix wiring remains caller-side. */
  noRateLimitMiddlewareInThisAdr: true,
  unicodePersianValuesSafe: true,
} as const;

export function assertRedisNeverSourceOfTruth(
  soleSourceOfTruth: boolean,
): void {
  if (soleSourceOfTruth) {
    throw new Error(
      "Redis must never be a source of truth (ADR-051); PostgreSQL remains OLTP SoT.",
    );
  }
  if (!REDIS_ENGINE.neverSourceOfTruth) {
    throw new Error("REDIS_ENGINE.neverSourceOfTruth must be true (ADR-051).");
  }
  if (FORBIDDEN_REDIS.asOltpSourceOfTruth !== false) {
    throw new Error(
      "FORBIDDEN_REDIS.asOltpSourceOfTruth must remain false (ADR-051).",
    );
  }
}

export function assertRedisRole(role: string): void {
  if (role !== REDIS_ENGINE.role) {
    throw new Error(
      `Redis role must be "${REDIS_ENGINE.role}" (ADR-051); got "${role}".`,
    );
  }
  if (COMPOSE_DATA_PLANES.redis.role !== REDIS_ENGINE.role) {
    throw new Error(
      "Compose redis plane role must match cache_aside_and_rate_limit (ADR-051 / ADR-066).",
    );
  }
}

export function assertRedisUrlConnectionKey(envVar: string): void {
  if (envVar !== CONNECTION.envVar) {
    throw new Error(
      `Redis connection env var must be "${CONNECTION.envVar}" (ADR-051); got "${envVar}".`,
    );
  }
}

export function assertKeyNamespaceDeferred(detailAdr: string): void {
  if (detailAdr !== KEY_NAMESPACE.detailAdr) {
    throw new Error(
      `Key namespace / TTL detail is ADR-053 (src/cache-keys); got "${detailAdr}".`,
    );
  }
  if (!KEY_NAMESPACE.merchantIdRequiredInBusinessKeys) {
    throw new Error(
      "Business cache keys must include merchantId (ADR-051 / ADR-048).",
    );
  }
  if (KEY_NAMESPACE.implementation !== "src/infrastructure/redis/cache-keys/") {
    throw new Error(
      "Key/TTL implementation must be src/cache-keys/ (ADR-053).",
    );
  }
}

export function assertFailOpenCachePolicy(policy: string): void {
  if (policy !== FAILURE_MODES.cacheReads.policy) {
    throw new Error(
      `Cache reads fail-open when Redis is down (ADR-051 → ADR-052); got "${policy}".`,
    );
  }
}

export function assertFailClosedAuthRateLimitPolicy(policy: string): void {
  if (policy !== FAILURE_MODES.authAndOtpRateLimits.policy) {
    throw new Error(
      `Auth/OTP rate limits fail-closed when Redis is down if policy requires (ADR-051 → ADR-055); got "${policy}".`,
    );
  }
}

export const REDIS_ARCHITECTURE = {
  engine: REDIS_ENGINE,
  forbidden: FORBIDDEN_REDIS,
  connection: CONNECTION,
  keyNamespace: KEY_NAMESPACE,
  failureModes: FAILURE_MODES,
  unicodeValueSafety: UNICODE_VALUE_SAFETY,
  deferredPlacement: DEFERRED_PLACEMENT,
  requirements: REDIS_REQUIREMENTS,
  alignsWith: {
    composeRedisPlane: COMPOSE_DATA_PLANES.redis.plane,
    composeRedisRole: COMPOSE_DATA_PLANES.redis.role,
  },
} as const;
