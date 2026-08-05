/**
 * ADR-112 readiness probe unit tests.
 */

import { describe, expect, it } from "vitest";

import {
  assertNoSecretsInReadinessBody,
  evaluateReadiness,
  readinessHttpStatus,
  resolveRequiredChecks,
  runReadinessChecks,
  withTimeout,
  ProbeTimeoutError,
  type ReadyCheckResult,
  type ReadyCheckName,
} from "./index.js";

function allUp(
  overrides: Partial<Record<ReadyCheckName, ReadyCheckResult>> = {},
): Record<ReadyCheckName, ReadyCheckResult> {
  return {
    postgres: { ok: true, required: true, latencyMs: 1 },
    redis: { ok: true, required: true, latencyMs: 1 },
    mongodb: { ok: true, required: false, latencyMs: 1 },
    emqx: { ok: true, required: false, latencyMs: 1 },
    minio: { ok: true, required: false, latencyMs: 1 },
    ...overrides,
  };
}

describe("ADR-112 readiness policy", () => {
  it("requires postgres + redis by default; optionals env-gated", () => {
    expect(resolveRequiredChecks({})).toEqual({
      postgres: true,
      redis: true,
      mongodb: false,
      emqx: false,
      minio: false,
    });
    expect(
      resolveRequiredChecks({
        MOS_READY_REQUIRE_MONGO: "1",
        MOS_READY_REQUIRE_EMQX: "true",
        MOS_READY_REQUIRE_MINIO: "on",
      }),
    ).toEqual({
      postgres: true,
      redis: true,
      mongodb: true,
      emqx: true,
      minio: true,
    });
  });

  it("is not_ready when a required check fails", () => {
    expect(evaluateReadiness(allUp())).toBe("ready");
    expect(
      evaluateReadiness(
        allUp({ postgres: { ok: false, required: true, detail: "unreachable" } }),
      ),
    ).toBe("not_ready");
    expect(
      evaluateReadiness(
        allUp({
          mongodb: { ok: false, required: false, detail: "unreachable" },
        }),
      ),
    ).toBe("ready");
    expect(
      evaluateReadiness(
        allUp({
          mongodb: { ok: false, required: true, detail: "unreachable" },
        }),
      ),
    ).toBe("not_ready");
  });

  it("maps ready → 200 and not_ready → 503", () => {
    expect(
      readinessHttpStatus({ status: "ready", checks: allUp() }),
    ).toBe(200);
    expect(
      readinessHttpStatus({
        status: "not_ready",
        checks: allUp({
          postgres: { ok: false, required: true, detail: "unreachable" },
        }),
      }),
    ).toBe(503);
  });

  it("rejects secret-bearing response bodies", () => {
    expect(() =>
      assertNoSecretsInReadinessBody(
        JSON.stringify({ status: "ready", checks: {} }),
      ),
    ).not.toThrow();
    expect(() =>
      assertNoSecretsInReadinessBody(
        '{"url":"postgres://merchantos:merchantos@localhost:5433/merchantos"}',
      ),
    ).toThrow(/credentials/i);
  });
});

describe("ADR-112 runReadinessChecks", () => {
  it("returns 503 not_ready when postgres unreachable", async () => {
    const report = await runReadinessChecks({
      env: {
        DATABASE_URL: "postgres://x",
        REDIS_URL: "redis://localhost:6379",
      },
      hasConfig: {
        postgres: true,
        redis: true,
        mongodb: false,
        emqx: false,
        minio: false,
      },
      pings: {
        postgres: async () => false,
        redis: async () => true,
        mongodb: async () => true,
        emqx: async () => true,
        minio: async () => true,
      },
    });
    expect(report.status).toBe("not_ready");
    expect(report.checks.postgres.ok).toBe(false);
    expect(report.checks.redis.ok).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/postgres:\/\//i);
  });

  it("returns ready when optional deps are down", async () => {
    const report = await runReadinessChecks({
      env: {
        DATABASE_URL: "postgres://x",
        REDIS_URL: "redis://x",
        MONGODB_URL: "mongodb://x",
        MQTT_URL: "mqtt://x",
        MINIO_ENDPOINT: "http://localhost:9000",
      },
      hasConfig: {
        postgres: true,
        redis: true,
        mongodb: true,
        emqx: true,
        minio: true,
      },
      pings: {
        postgres: async () => true,
        redis: async () => true,
        mongodb: async () => false,
        emqx: async () => false,
        minio: async () => false,
      },
    });
    expect(report.status).toBe("ready");
    expect(report.checks.mongodb.ok).toBe(false);
    expect(report.checks.emqx.ok).toBe(false);
    expect(report.checks.minio.ok).toBe(false);
    expect(report.checks.mongodb.required).toBe(false);
  });

  it("fails when optional dep is required via env and down", async () => {
    const report = await runReadinessChecks({
      env: {
        DATABASE_URL: "postgres://x",
        REDIS_URL: "redis://x",
        MONGODB_URL: "mongodb://x",
        MOS_READY_REQUIRE_MONGO: "1",
      },
      hasConfig: {
        postgres: true,
        redis: true,
        mongodb: true,
        emqx: false,
        minio: false,
      },
      pings: {
        postgres: async () => true,
        redis: async () => true,
        mongodb: async () => false,
        emqx: async () => true,
        minio: async () => true,
      },
    });
    expect(report.status).toBe("not_ready");
    expect(report.checks.mongodb.required).toBe(true);
    expect(report.checks.mongodb.ok).toBe(false);
  });

  it("marks missing required config as missing_config", async () => {
    const report = await runReadinessChecks({
      env: {},
      hasConfig: {
        postgres: false,
        redis: false,
        mongodb: false,
        emqx: false,
        minio: false,
      },
      pings: {
        postgres: async () => true,
        redis: async () => true,
        mongodb: async () => true,
        emqx: async () => true,
        minio: async () => true,
      },
    });
    expect(report.status).toBe("not_ready");
    expect(report.checks.postgres.detail).toBe("missing_config");
    expect(report.checks.redis.detail).toBe("missing_config");
    expect(report.checks.mongodb.skipped).toBe(true);
  });

  it("records timeout detail when a ping exceeds budget", async () => {
    const report = await runReadinessChecks({
      env: { DATABASE_URL: "postgres://x", REDIS_URL: "redis://x" },
      timeoutMs: 30,
      hasConfig: {
        postgres: true,
        redis: true,
        mongodb: false,
        emqx: false,
        minio: false,
      },
      pings: {
        postgres: () =>
          new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(true), 200);
          }),
        redis: async () => true,
        mongodb: async () => true,
        emqx: async () => true,
        minio: async () => true,
      },
    });
    expect(report.status).toBe("not_ready");
    expect(report.checks.postgres.detail).toBe("timeout");
  });
});

describe("withTimeout", () => {
  it("rejects with ProbeTimeoutError", async () => {
    await expect(
      withTimeout(
        new Promise((resolve) => {
          setTimeout(() => resolve("late"), 100);
        }),
        10,
        "demo",
      ),
    ).rejects.toBeInstanceOf(ProbeTimeoutError);
  });
});
