/**
 * ADR-071 — Scalability Stateless Multi-Instance contract.
 *
 * NFR-02: app instances are stateless; JWT sessions; shared Redis/PG/Mongo/EMQX;
 * horizontal scale behind a load balancer with no sticky affinity required.
 *
 * Normative prose:
 * - docs/product/non-functional-requirements.md (NFR-02)
 * - docs/architecture/11-deployment-architecture.md
 * - docs/architecture/19-performance-architecture.md
 * - docs/deployment/zero-downtime.md
 *
 * Session: `src/nextauth-jwt` (ADR-033). Redis: `src/redis-architecture` (ADR-051).
 * Deploy unit: `src/modular-monolith` (ADR-004). Image/process: `src/containerization` (ADR-067).
 */

import { DEPLOYABLE } from "../modular-monolith/index.js";
import {
  NEXTAUTH_JWT_DECISION,
  type MerchantJwtClaims,
} from "../nextauth-jwt/index.js";
import { REDIS_REQUIREMENTS } from "../redis-architecture/index.js";
import { TWELVE_FACTOR_RULES } from "../containerization/index.js";

/** Binds this contract to NFR-02. */
export const NFR_ID = "NFR-02" as const;

/** Normative documents. */
export const SCALABILITY_DOCS = {
  nfr: "docs/product/non-functional-requirements.md",
  deployment: "docs/architecture/11-deployment-architecture.md",
  performance: "docs/architecture/19-performance-architecture.md",
  zeroDowntime: "docs/deployment/zero-downtime.md",
  systemOverview: "docs/architecture/01-system-overview.md",
} as const;

/**
 * Core decision — stateless app; JWT; shared data/coordination planes; LB scale-out.
 */
export const SCALABILITY_DECISION = {
  adr: "ADR-071",
  nfr: NFR_ID,
  appModel: "stateless" as const,
  sessionModel: "jwt" as const,
  stickySessionsRequired: false,
  stickySessionsForbiddenAsRequirement: true,
  scaleModel: "horizontal_behind_lb" as const,
  alternativeRejected: "vertical_only",
  rationale: "NFR-02_growth_many_merchants",
} as const;

/**
 * Shared planes every app instance must use (never local sticky SoT).
 * Compose / managed topology detail → ADR-066 / ADR-072.
 */
export const SHARED_PLANES = {
  postgresql: {
    role: "oltp_sot",
    envVar: "DATABASE_URL",
    sharedAcrossInstances: true,
  },
  redis: {
    role: "cache_aside_and_rate_limit",
    envVar: "REDIS_URL",
    sharedAcrossInstances: true,
    neverSourceOfTruth: true,
  },
  mongodb: {
    role: "analytics_audit_telemetry",
    envVar: "MONGODB_URL",
    sharedAcrossInstances: true,
    neverOltpSot: true,
  },
  emqx: {
    role: "realtime_fanout",
    sharedAcrossInstances: true,
    crossInstanceFanout: true,
  },
} as const;

export type SharedPlaneName = keyof typeof SHARED_PLANES;

/**
 * Production topology — N ≥ 2; LB health checks; no sticky affinity.
 * Zero-downtime expand/contract → ADR-070.
 */
export const PRODUCTION_TOPOLOGY = {
  minAppInstances: 2,
  loadBalancerRequired: true,
  stickyAffinityRequired: false,
  healthProbePath: "/api/health",
  readyProbePath: "/api/ready",
  rollingOrBlueGreen: true,
  zeroDowntimeDetailAdr: "ADR-070",
  dataPlaneTopologyAdr: "ADR-072",
} as const;

/**
 * Per-process infra that is NOT request sticky identity.
 * Allowed: connection pools, HMR singleton on globalThis, worker poll loops.
 */
export const ALLOWED_PROCESS_LOCAL = {
  dbConnectionPools: true,
  redisClientPerProcess: true,
  globalThisHmrSingletons: true,
  workerPollLoopState: true,
  /** Explicit: these must not store auth/session affinity. */
  mayNotStoreSessionIdentity: true,
  mayNotReplaceSharedRateLimitOrCache: true,
} as const;

/**
 * Forbidden production patterns that break multi-instance correctness.
 */
export const FORBIDDEN_STICKY_STATE = {
  lbStickySessionAffinityRequired: false,
  databaseSessionStore: false,
  inProcessOnlyRateLimitAsSoleProductionPath: false,
  inProcessOnlyBusinessCacheAsSoleProductionPath: false,
  localDiskSessionOrUploadSotOnAppNode: false,
  requestAffinityForAuthIdentity: false,
} as const;

/**
 * Session binding — must remain JWT (ADR-033). Claims ride the token, not the node.
 */
export const SESSION_BINDING = {
  strategy: NEXTAUTH_JWT_DECISION.strategy,
  databaseSessionStore: NEXTAUTH_JWT_DECISION.databaseSessionStore,
  claimKeysCarryTenant: true as const,
  implementation: "src/nextauth-jwt",
  authConfigPath: "src/auth.config.ts",
  relatedAdr: "ADR-033",
} as const;

/**
 * Bottleneck note from ADR tradeoffs — shared DB mitigated by indexes/cache/projections.
 */
export const BOTTLENECK_MITIGATIONS = {
  sharedDbBottleneckAcknowledged: true,
  mitigations: ["indexes", "cache_aside", "async_projections"] as const,
  futureEvolution: ["read_replicas", "partition_adr"] as const,
} as const;

/**
 * Iranian First / ops notes — no merchant UI this ADR.
 */
export const SCALABILITY_UX_NOTES = {
  locale: "fa-IR",
  opsDocsMayBeEnglish: true,
  merchantVisibleStatusMustBePersian: true,
  rtlOperatorUiIfShipped: true,
  mustNotRegressMobileAssetPerformance: true,
  iranHostingLatencyConsiderations: "documented_in_ops_adrs",
} as const;

export const SCALABILITY_REQUIREMENTS = {
  statelessAppInstances: true,
  jwtSessions: true,
  sharedRedisPostgresMongoEmqx: true,
  horizontalScaleBehindLb: true,
  noStickyRequired: true,
  productionMinTwoInstances: true,
  nfr02: true,
} as const;

export const SCALABILITY_MODULE = {
  contractPath: "src/scalability-stateless",
  adr: "ADR-071",
} as const;

export const SCALABILITY_STATELESS = {
  decision: SCALABILITY_DECISION,
  sharedPlanes: SHARED_PLANES,
  productionTopology: PRODUCTION_TOPOLOGY,
  allowedProcessLocal: ALLOWED_PROCESS_LOCAL,
  forbiddenStickyState: FORBIDDEN_STICKY_STATE,
  sessionBinding: SESSION_BINDING,
  bottleneckMitigations: BOTTLENECK_MITIGATIONS,
  uxNotes: SCALABILITY_UX_NOTES,
  requirements: SCALABILITY_REQUIREMENTS,
  module: SCALABILITY_MODULE,
  docs: SCALABILITY_DOCS,
  alignsWith: {
    modularMonolithProcessModel: DEPLOYABLE.processModel,
    jwtStrategy: NEXTAUTH_JWT_DECISION.strategy,
    redisSharedAcrossInstances: REDIS_REQUIREMENTS.sharedAcrossInstances,
    twelveFactorStateless: TWELVE_FACTOR_RULES.statelessProcess,
    twelveFactorScaleOut: TWELVE_FACTOR_RULES.scaleOutReady,
  },
} as const;

export function assertStatelessAppModel(model: string): void {
  if (model !== SCALABILITY_DECISION.appModel) {
    throw new Error(
      `App model must be "${SCALABILITY_DECISION.appModel}" (ADR-071 / NFR-02); got "${model}".`,
    );
  }
  if (DEPLOYABLE.processModel !== "stateless_node") {
    throw new Error(
      'Modular monolith processModel must be "stateless_node" (ADR-004 / ADR-071).',
    );
  }
  if (!TWELVE_FACTOR_RULES.statelessProcess) {
    throw new Error(
      "Twelve-factor statelessProcess must be true (ADR-067 / ADR-071).",
    );
  }
}

export function assertNoStickySessionsRequired(
  stickySessionsRequired: boolean,
): void {
  if (stickySessionsRequired) {
    throw new Error(
      "Sticky sessions must not be required (ADR-071); use JWT + shared planes.",
    );
  }
  if (SCALABILITY_DECISION.stickySessionsRequired !== false) {
    throw new Error(
      "SCALABILITY_DECISION.stickySessionsRequired must remain false (ADR-071).",
    );
  }
  if (PRODUCTION_TOPOLOGY.stickyAffinityRequired !== false) {
    throw new Error(
      "Production LB sticky affinity must not be required (ADR-071).",
    );
  }
}

export function assertJwtSessionModel(strategy: string): void {
  if (strategy !== "jwt") {
    throw new Error(
      `Session model must be JWT (ADR-071 / ADR-033); got "${strategy}".`,
    );
  }
  if (NEXTAUTH_JWT_DECISION.strategy !== "jwt") {
    throw new Error("NEXTAUTH_JWT_DECISION.strategy must be jwt (ADR-033).");
  }
  if (NEXTAUTH_JWT_DECISION.databaseSessionStore !== "forbidden") {
    throw new Error(
      "Database session store is forbidden for horizontal scale (ADR-033 / ADR-071).",
    );
  }
}

export function assertSharedPlane(
  plane: SharedPlaneName,
  sharedAcrossInstances: boolean,
): void {
  if (!sharedAcrossInstances) {
    throw new Error(
      `Shared plane "${plane}" must be shared across app instances (ADR-071).`,
    );
  }
  const def = SHARED_PLANES[plane];
  if (!def.sharedAcrossInstances) {
    throw new Error(
      `SHARED_PLANES.${plane}.sharedAcrossInstances must be true (ADR-071).`,
    );
  }
  if (plane === "redis" && !REDIS_REQUIREMENTS.sharedAcrossInstances) {
    throw new Error(
      "Redis must be sharedAcrossInstances (ADR-051 / ADR-071).",
    );
  }
}

export function assertProductionMinInstances(count: number): void {
  if (count < PRODUCTION_TOPOLOGY.minAppInstances) {
    throw new Error(
      `Production app instances must be ≥ ${PRODUCTION_TOPOLOGY.minAppInstances} (ADR-071); got ${count}.`,
    );
  }
  if (!TWELVE_FACTOR_RULES.scaleOutReady) {
    throw new Error(
      "Twelve-factor scaleOutReady must be true (ADR-067 / ADR-071).",
    );
  }
}

export function assertNoInProcessOnlyProductionPath(options: {
  rateLimitSolePath: "redis" | "memory";
  businessCacheSolePath: "redis" | "memory";
}): void {
  if (options.rateLimitSolePath === "memory") {
    throw new Error(
      "Production rate limits must not be in-process-only (ADR-071 / ADR-051); use shared Redis.",
    );
  }
  if (options.businessCacheSolePath === "memory") {
    throw new Error(
      "Production business cache must not be in-process-only (ADR-071 / ADR-051); use shared Redis.",
    );
  }
}

/**
 * Claims must be self-contained so any instance can authorize the same cookie/JWT.
 */
export function assertPortableJwtClaims(
  claims: Partial<MerchantJwtClaims>,
): void {
  if (!SESSION_BINDING.claimKeysCarryTenant) {
    throw new Error(
      "JWT claims must carry tenant context for portable sessions (ADR-071).",
    );
  }
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new Error(
      'Portable JWT requires non-empty "sub" (ADR-071 / ADR-033).',
    );
  }
  if (!("merchantId" in claims)) {
    throw new Error(
      'Portable JWT requires "merchantId" claim key (ADR-071 / ADR-033).',
    );
  }
  if (!("roles" in claims) || !Array.isArray(claims.roles)) {
    throw new Error(
      'Portable JWT requires "roles" array claim (ADR-071 / ADR-033).',
    );
  }
  if (
    typeof claims.tokenVersion !== "number" ||
    !Number.isInteger(claims.tokenVersion)
  ) {
    throw new Error(
      'Portable JWT requires integer "tokenVersion" (ADR-071 / ADR-033).',
    );
  }
}
