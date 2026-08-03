/**
 * ADR-066 — Docker Compose local parity contract.
 * Local stack mirrors prod data planes: PG OLTP, Redis, EMQX, MinIO, Mongo analytics.
 * Mongo is never the OLTP source of truth.
 */

import { PRODUCT_ARCHITECTURE } from "../product-architecture/index.js";

/** Compose service names (ADR-066 Decision + infrastructure architecture). */
export const COMPOSE_SERVICES = [
  "app",
  "postgres",
  "redis",
  "emqx",
  "minio",
  "mongo",
] as const;

export type ComposeService = (typeof COMPOSE_SERVICES)[number];

/** Host→container port expectations from docs/architecture/12-infrastructure-architecture.md */
export const COMPOSE_SERVICE_PORTS = {
  app: [3000],
  postgres: [5432],
  mongo: [27017],
  redis: [6379],
  emqx: [1883, 8083, 18083],
  minio: [9000, 9001],
} as const satisfies Record<ComposeService, readonly number[]>;

/**
 * Data-plane roles. Aligns with PRODUCT_ARCHITECTURE.dataPlanes:
 * postgresql = OLTP SoT; mongodb = analytics/audit/telemetry only.
 */
export const COMPOSE_DATA_PLANES = {
  postgres: {
    plane: "postgresql_oltp",
    role: "oltp_source_of_truth",
    engine: PRODUCT_ARCHITECTURE.dataPlanes.oltp,
  },
  mongo: {
    plane: "mongodb_analytics",
    role: "analytics_audit_telemetry_only",
    engine: PRODUCT_ARCHITECTURE.dataPlanes.analytics,
    neverOltpSourceOfTruth: true,
  },
  redis: { plane: "cache", role: "cache_aside_and_rate_limit" },
  emqx: { plane: "realtime", role: "mqtt_event_bus" },
  minio: { plane: "object_storage", role: "s3_compatible_files" },
  app: { plane: "application", role: "nextjs_modular_monolith" },
} as const satisfies Record<
  ComposeService,
  {
    plane: string;
    role: string;
    engine?: string;
    neverOltpSourceOfTruth?: boolean;
  }
>;

/** Named volumes required for durable local data (ADR-066 Decision). */
export const COMPOSE_NAMED_VOLUMES = [
  "postgres_data",
  "mongo_data",
  "redis_data",
  "minio_data",
] as const;

/** App is optional so laptops can run data plane only. */
export const COMPOSE_APP_PROFILE = {
  service: "app",
  profile: "app",
  optional: true,
} as const;

/**
 * Iranian First — Postgres must init as UTF-8 so Persian (fa) retail text
 * (product names, notes, addresses) does not mojibake locally.
 */
export const POSTGRES_UTF8_REQUIREMENTS = {
  encoding: "UTF8",
  locale: "C.UTF-8",
  supportsPersianText: true,
  initDbArgsContains: ["--encoding=UTF8", "--locale=C.UTF-8"],
  langEnv: "C.UTF-8",
} as const;

export const COMPOSE_FILES = {
  compose: "docker-compose.yml",
  envExample: ".env.example",
} as const;

/** Non-secret env keys that local parity documents in .env.example. */
export const ENV_EXAMPLE_REQUIRED_KEYS = [
  "APP_PORT",
  "POSTGRES_PORT",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "DATABASE_URL",
  "MONGO_PORT",
  "MONGO_DB",
  "MONGODB_URL",
  "REDIS_URL",
  "MQTT_URL",
  "MINIO_ENDPOINT",
  /** ADR-068 — dedicated auth secret placeholder (never a real prod value). */
  "AUTH_SECRET",
] as const;

export const COMPOSE_REQUIREMENTS = {
  healthchecksRequired: true,
  namedVolumesRequired: true,
  privateBridgeNetwork: true,
  secretsNotCommitted: true,
  mongoNeverOltpSot: true,
  postgresUtf8ForPersian: true,
} as const;

export function isComposeService(name: string): name is ComposeService {
  return (COMPOSE_SERVICES as readonly string[]).includes(name);
}

export function assertMongoNeverOltpSot(planeRole: string): void {
  if (planeRole === "oltp_source_of_truth") {
    throw new Error(
      "MongoDB must never be the OLTP source of truth (ADR-066 / ADR-056).",
    );
  }
  if (!COMPOSE_DATA_PLANES.mongo.neverOltpSourceOfTruth) {
    throw new Error(
      "Compose mongo plane must set neverOltpSourceOfTruth (ADR-066).",
    );
  }
}

export function assertPostgresUtf8Ready(initDbArgs: string): void {
  for (const token of POSTGRES_UTF8_REQUIREMENTS.initDbArgsContains) {
    if (!initDbArgs.includes(token)) {
      throw new Error(
        `Postgres init must include ${token} for Persian UTF-8 text (ADR-066 Iranian First).`,
      );
    }
  }
}

/**
 * Lightweight compose service-name extraction (no YAML dependency).
 * Expects top-level `services:` then indented `name:` keys.
 */
export function extractComposeServiceNames(composeYaml: string): string[] {
  const lines = composeYaml.split(/\r?\n/);
  const names: string[] = [];
  let inServices = false;

  for (const line of lines) {
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }
    if (inServices) {
      if (/^[A-Za-z]/.test(line) && !/^\s/.test(line)) {
        break;
      }
      const match = /^ {2}([a-z][a-z0-9_-]*):\s*$/.exec(line);
      if (match) {
        names.push(match[1]!);
      }
    }
  }

  return names;
}

export const DOCKER_COMPOSE_PARITY = {
  services: COMPOSE_SERVICES,
  ports: COMPOSE_SERVICE_PORTS,
  planes: COMPOSE_DATA_PLANES,
  namedVolumes: COMPOSE_NAMED_VOLUMES,
  appProfile: COMPOSE_APP_PROFILE,
  postgresUtf8: POSTGRES_UTF8_REQUIREMENTS,
  files: COMPOSE_FILES,
  envExampleKeys: ENV_EXAMPLE_REQUIRED_KEYS,
  requirements: COMPOSE_REQUIREMENTS,
} as const;
