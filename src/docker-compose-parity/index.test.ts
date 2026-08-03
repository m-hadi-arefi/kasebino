import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_ARCHITECTURE } from "../product-architecture/index.js";
import {
  COMPOSE_APP_PROFILE,
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_NAMED_VOLUMES,
  COMPOSE_REQUIREMENTS,
  COMPOSE_SERVICE_PORTS,
  COMPOSE_SERVICES,
  DOCKER_COMPOSE_PARITY,
  ENV_EXAMPLE_REQUIRED_KEYS,
  POSTGRES_UTF8_REQUIREMENTS,
  assertMongoNeverOltpSot,
  assertPostgresUtf8Ready,
  extractComposeServiceNames,
  isComposeService,
} from "./index.js";

const root = process.cwd();

describe("ADR-066 Docker Compose local parity", () => {
  it("declares local parity services including optional app profile", () => {
    expect(COMPOSE_SERVICES).toEqual([
      "app",
      "postgres",
      "redis",
      "emqx",
      "minio",
      "mongo",
    ]);
    expect(COMPOSE_APP_PROFILE.optional).toBe(true);
    expect(COMPOSE_APP_PROFILE.profile).toBe("app");
    expect(isComposeService("postgres")).toBe(true);
    expect(isComposeService("delivery")).toBe(false);
    expect(DOCKER_COMPOSE_PARITY.services).toEqual(COMPOSE_SERVICES);
  });

  it("locks host ports to infrastructure architecture defaults", () => {
    expect(COMPOSE_SERVICE_PORTS.app).toEqual([3000]);
    expect(COMPOSE_SERVICE_PORTS.postgres).toEqual([5432]);
    expect(COMPOSE_SERVICE_PORTS.mongo).toEqual([27017]);
    expect(COMPOSE_SERVICE_PORTS.redis).toEqual([6379]);
    expect(COMPOSE_SERVICE_PORTS.emqx).toEqual([1883, 8083, 18083]);
    expect(COMPOSE_SERVICE_PORTS.minio).toEqual([9000, 9001]);
  });

  it("assigns PG as OLTP SoT and Mongo as analytics-only plane", () => {
    expect(COMPOSE_DATA_PLANES.postgres.plane).toBe("postgresql_oltp");
    expect(COMPOSE_DATA_PLANES.postgres.role).toBe("oltp_source_of_truth");
    expect(COMPOSE_DATA_PLANES.postgres.engine).toBe(
      PRODUCT_ARCHITECTURE.dataPlanes.oltp,
    );
    expect(COMPOSE_DATA_PLANES.mongo.plane).toBe("mongodb_analytics");
    expect(COMPOSE_DATA_PLANES.mongo.neverOltpSourceOfTruth).toBe(true);
    expect(COMPOSE_DATA_PLANES.mongo.engine).toBe(
      PRODUCT_ARCHITECTURE.dataPlanes.analytics,
    );
    expect(COMPOSE_REQUIREMENTS.mongoNeverOltpSot).toBe(true);
    expect(() =>
      assertMongoNeverOltpSot(COMPOSE_DATA_PLANES.mongo.role),
    ).not.toThrow();
    expect(() => assertMongoNeverOltpSot("oltp_source_of_truth")).toThrow(
      /OLTP/i,
    );
  });

  it("requires UTF-8 Postgres so Persian (fa) text is safe locally", () => {
    expect(POSTGRES_UTF8_REQUIREMENTS.encoding).toBe("UTF8");
    expect(POSTGRES_UTF8_REQUIREMENTS.supportsPersianText).toBe(true);
    expect(COMPOSE_REQUIREMENTS.postgresUtf8ForPersian).toBe(true);
    expect(() =>
      assertPostgresUtf8Ready("--encoding=UTF8 --locale=C.UTF-8"),
    ).not.toThrow();
    expect(() => assertPostgresUtf8Ready("--encoding=SQL_ASCII")).toThrow(
      /UTF8/i,
    );
  });

  it("requires healthchecks and named volumes", () => {
    expect(COMPOSE_REQUIREMENTS.healthchecksRequired).toBe(true);
    expect(COMPOSE_REQUIREMENTS.namedVolumesRequired).toBe(true);
    expect(COMPOSE_NAMED_VOLUMES).toEqual(
      expect.arrayContaining([
        "postgres_data",
        "mongo_data",
        "redis_data",
        "minio_data",
      ]),
    );
  });

  it("ships docker-compose.yml whose services match the contract", () => {
    const composePath = join(root, COMPOSE_FILES.compose);
    expect(existsSync(composePath)).toBe(true);
    const yaml = readFileSync(composePath, "utf8");
    const names = extractComposeServiceNames(yaml);
    expect(names.sort()).toEqual([...COMPOSE_SERVICES].sort());

    for (const service of COMPOSE_SERVICES) {
      if (service === "app") {
        expect(yaml).toMatch(/profiles:\s*\n\s*-\s*["']?app["']?/);
      } else {
        expect(yaml).toContain("healthcheck:");
      }
    }

    expect(yaml).toContain("POSTGRES_INITDB_ARGS");
    expect(yaml).toContain("--encoding=UTF8");
    expect(yaml).toContain("--locale=C.UTF-8");
    expect(yaml).toContain("postgres_data:");
    expect(yaml).toContain("mongo_data:");
    expect(yaml).toContain("redis_data:");
    expect(yaml).toContain("minio_data:");
    expect(yaml).not.toMatch(/^\s*delivery:/m);
  });

  it("ships .env.example with non-secret local defaults (secrets not committed)", () => {
    const envPath = join(root, COMPOSE_FILES.envExample);
    expect(existsSync(envPath)).toBe(true);
    const env = readFileSync(envPath, "utf8");
    for (const key of ENV_EXAMPLE_REQUIRED_KEYS) {
      expect(env).toMatch(new RegExp(`^${key}=`, "m"));
    }
    expect(COMPOSE_REQUIREMENTS.secretsNotCommitted).toBe(true);
    expect(existsSync(join(root, ".env"))).toBe(false);
  });
});
