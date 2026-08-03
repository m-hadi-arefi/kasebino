import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_SERVICE_PORTS,
  extractComposeServiceNames,
} from "../docker-compose-parity/index.js";
import {
  createRedisConfig,
  createRedisConfigFromEnv,
} from "../infrastructure/redis/client.js";
import {
  CONNECTION,
  DEFERRED_PLACEMENT,
  FAILURE_MODES,
  FORBIDDEN_REDIS,
  KEY_NAMESPACE,
  REDIS_ARCHITECTURE,
  REDIS_ENGINE,
  REDIS_REQUIREMENTS,
  UNICODE_VALUE_SAFETY,
  assertFailClosedAuthRateLimitPolicy,
  assertFailOpenCachePolicy,
  assertKeyNamespaceDeferred,
  assertRedisNeverSourceOfTruth,
  assertRedisRole,
  assertRedisUrlConnectionKey,
} from "./index.js";

const root = process.cwd();

describe("ADR-051 Redis Architecture", () => {
  it("locks Redis as shared cache-aside and rate-limit plane (never SoT)", () => {
    expect(REDIS_ENGINE.name).toBe("redis");
    expect(REDIS_ENGINE.role).toBe("cache_aside_and_rate_limit");
    expect(REDIS_ENGINE.plane).toBe("cache");
    expect(REDIS_ENGINE.neverSourceOfTruth).toBe(true);
    expect(REDIS_ENGINE.soleSourceOfTruth).toBe(false);
    expect(REDIS_REQUIREMENTS.sharedAcrossInstances).toBe(true);
    expect(REDIS_REQUIREMENTS.cacheAsideAndRateLimit).toBe(true);
    expect(REDIS_REQUIREMENTS.neverSourceOfTruth).toBe(true);

    expect(FORBIDDEN_REDIS.asOltpSourceOfTruth).toBe(false);
    expect(COMPOSE_DATA_PLANES.redis.role).toBe("cache_aside_and_rate_limit");
    expect(REDIS_ARCHITECTURE.alignsWith.composeRedisRole).toBe(
      COMPOSE_DATA_PLANES.redis.role,
    );

    expect(() => assertRedisRole("cache_aside_and_rate_limit")).not.toThrow();
    expect(() => assertRedisRole("oltp_source_of_truth")).toThrow(
      /cache_aside_and_rate_limit/i,
    );
    expect(() => assertRedisNeverSourceOfTruth(false)).not.toThrow();
    expect(() => assertRedisNeverSourceOfTruth(true)).toThrow(
      /never be a source of truth/i,
    );
  });

  it("connects via REDIS_URL documented in compose and .env.example", () => {
    expect(CONNECTION.envVar).toBe("REDIS_URL");
    expect(CONNECTION.scheme).toBe("redis://");
    expect(REDIS_REQUIREMENTS.connectViaRedisUrl).toBe(true);

    expect(() => assertRedisUrlConnectionKey("REDIS_URL")).not.toThrow();
    expect(() => assertRedisUrlConnectionKey("REDIS_HOST")).toThrow(
      /REDIS_URL/i,
    );

    const envPath = join(root, COMPOSE_FILES.envExample);
    expect(existsSync(envPath)).toBe(true);
    const env = readFileSync(envPath, "utf8");
    expect(env).toMatch(/^REDIS_URL=/m);
    expect(env).toMatch(/redis:\/\//);
  });

  it("verifies compose ships redis cache plane with REDIS_URL wiring", () => {
    const composePath = join(root, COMPOSE_FILES.compose);
    expect(existsSync(composePath)).toBe(true);
    const yaml = readFileSync(composePath, "utf8");
    const names = extractComposeServiceNames(yaml);

    expect(names).toContain("redis");
    expect(yaml).toMatch(/^\s*redis:\s*$/m);
    expect(yaml).toContain("REDIS_URL");
    expect(yaml).toContain("redis://redis:6379");
    expect(yaml).toContain("redis:7-alpine");
    expect(yaml).toContain("redis-cli");
    expect(yaml).toContain("redis_data");
    expect(COMPOSE_SERVICE_PORTS.redis).toEqual([6379]);
    expect(COMPOSE_DATA_PLANES.redis.plane).toBe("cache");
    expect(REDIS_ENGINE.composePort).toBe(6379);
  });

  it("realizes key namespace / TTL in ADR-053 src/cache-keys with merchantId", () => {
    expect(KEY_NAMESPACE.prefix).toBe("mos");
    expect(KEY_NAMESPACE.detailAdr).toBe("ADR-053");
    expect(KEY_NAMESPACE.implementation).toBe("src/cache-keys/");
    expect(KEY_NAMESPACE.merchantIdRequiredInBusinessKeys).toBe(true);
    expect(KEY_NAMESPACE.highLevelPattern).toContain("merchantId");
    expect(REDIS_REQUIREMENTS.keyNamespaceDefer053).toBe(false);
    expect(REDIS_REQUIREMENTS.keysTtlImplementedAdr053).toBe(true);
    expect(DEFERRED_PLACEMENT.keysTtlAdr).toBe("ADR-053");
    expect(DEFERRED_PLACEMENT.cacheKeysPackage).toBe("src/cache-keys/");

    expect(() => assertKeyNamespaceDeferred("ADR-053")).not.toThrow();
    expect(() => assertKeyNamespaceDeferred("ADR-051")).toThrow(/ADR-053/i);
  });

  it("notes fail-open cache and fail-closed auth rate-limit (ADR-055 implemented)", () => {
    expect(FAILURE_MODES.cacheReads.policy).toBe("fail_open");
    expect(FAILURE_MODES.cacheReads.detailAdr).toBe("ADR-052");
    expect(FAILURE_MODES.authAndOtpRateLimits.policy).toBe("fail_closed");
    expect(FAILURE_MODES.authAndOtpRateLimits.detailAdr).toBe("ADR-055");
    expect(FAILURE_MODES.authAndOtpRateLimits.implementation).toBe(
      "src/rate-limiting",
    );
    expect(FAILURE_MODES.generalRateLimits.policy).toBe("fail_open");
    expect(REDIS_REQUIREMENTS.failPolicyNotesDefer055).toBe(false);
    expect(REDIS_REQUIREMENTS.rateLimitImplementedAdr055).toBe(true);
    expect(REDIS_REQUIREMENTS.noCacheAsideInThisAdr).toBe(false);
    expect(REDIS_REQUIREMENTS.cacheAsideImplementedAdr052).toBe(true);
    expect(REDIS_REQUIREMENTS.noRateLimitMiddlewareInThisAdr).toBe(true);
    expect(DEFERRED_PLACEMENT.rateLimitPackage).toBe("src/rate-limiting/");
    expect(DEFERRED_PLACEMENT.cacheAsidePackage).toBe("src/cache-aside/");
    expect(DEFERRED_PLACEMENT.cacheInvalidationPackage).toBe(
      "src/cache-invalidation/",
    );
    expect(REDIS_REQUIREMENTS.invalidationDefer054).toBe(false);
    expect(REDIS_REQUIREMENTS.invalidationImplementedAdr054).toBe(true);

    expect(() => assertFailOpenCachePolicy("fail_open")).not.toThrow();
    expect(() => assertFailOpenCachePolicy("fail_closed")).toThrow(
      /fail-open/i,
    );
    expect(() =>
      assertFailClosedAuthRateLimitPolicy("fail_closed"),
    ).not.toThrow();
    expect(() => assertFailClosedAuthRateLimitPolicy("fail_open")).toThrow(
      /fail-closed/i,
    );
  });

  it("requires Unicode-safe Persian values in cache payloads", () => {
    expect(UNICODE_VALUE_SAFETY.preserveUtf8PersianInValues).toBe(true);
    expect(UNICODE_VALUE_SAFETY.keysRemainIdBased).toBe(true);
    expect(UNICODE_VALUE_SAFETY.noAsciiScrubOfCachedFaText).toBe(true);
    expect(REDIS_REQUIREMENTS.unicodePersianValuesSafe).toBe(true);
  });

  it("exposes a thin REDIS_URL client stub under infrastructure", () => {
    expect(DEFERRED_PLACEMENT.clientStub).toBe(
      "src/infrastructure/redis/client.ts",
    );

    const cfg = createRedisConfig("redis://localhost:6379");
    expect(cfg.url).toBe("redis://localhost:6379");
    expect(cfg.envVar).toBe("REDIS_URL");

    expect(
      createRedisConfigFromEnv({ REDIS_URL: "rediss://cache.example:6380" })
        .url,
    ).toBe("rediss://cache.example:6380");

    expect(() => createRedisConfigFromEnv({})).toThrow(/REDIS_URL/i);
    expect(() => createRedisConfig("http://localhost:6379")).toThrow(
      /redis:\/\//i,
    );
  });
});
