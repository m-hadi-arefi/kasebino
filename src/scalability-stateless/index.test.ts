/**
 * Tests: ADR-071 Scalability Stateless Multi-Instance contract.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TWELVE_FACTOR_RULES } from "../containerization/index.js";
import { DEPLOYABLE } from "../modular-monolith/index.js";
import { NEXTAUTH_JWT_DECISION } from "../nextauth-jwt/index.js";
import { REDIS_REQUIREMENTS } from "../redis-architecture/index.js";
import {
  ALLOWED_PROCESS_LOCAL,
  BOTTLENECK_MITIGATIONS,
  FORBIDDEN_STICKY_STATE,
  NFR_ID,
  PRODUCTION_TOPOLOGY,
  SCALABILITY_DECISION,
  SCALABILITY_DOCS,
  SCALABILITY_REQUIREMENTS,
  SCALABILITY_STATELESS,
  SCALABILITY_UX_NOTES,
  SESSION_BINDING,
  SHARED_PLANES,
  assertJwtSessionModel,
  assertNoInProcessOnlyProductionPath,
  assertNoStickySessionsRequired,
  assertPortableJwtClaims,
  assertProductionMinInstances,
  assertSharedPlane,
  assertStatelessAppModel,
} from "./index.js";

const root = process.cwd();

describe("ADR-071 Scalability Stateless Multi-Instance", () => {
  it("locks NFR-02 stateless + JWT + horizontal LB scale (no sticky)", () => {
    expect(NFR_ID).toBe("NFR-02");
    expect(SCALABILITY_DECISION.appModel).toBe("stateless");
    expect(SCALABILITY_DECISION.sessionModel).toBe("jwt");
    expect(SCALABILITY_DECISION.stickySessionsRequired).toBe(false);
    expect(SCALABILITY_DECISION.scaleModel).toBe("horizontal_behind_lb");
    expect(SCALABILITY_DECISION.alternativeRejected).toBe("vertical_only");
    expect(SCALABILITY_REQUIREMENTS.nfr02).toBe(true);
    expect(SCALABILITY_REQUIREMENTS.noStickyRequired).toBe(true);

    expect(() => assertStatelessAppModel("stateless")).not.toThrow();
    expect(() => assertStatelessAppModel("sticky")).toThrow(/stateless/i);
    expect(() => assertNoStickySessionsRequired(false)).not.toThrow();
    expect(() => assertNoStickySessionsRequired(true)).toThrow(/sticky/i);
  });

  it("requires shared Redis / Postgres / Mongo / EMQX across instances", () => {
    expect(SHARED_PLANES.postgresql.sharedAcrossInstances).toBe(true);
    expect(SHARED_PLANES.postgresql.envVar).toBe("DATABASE_URL");
    expect(SHARED_PLANES.redis.sharedAcrossInstances).toBe(true);
    expect(SHARED_PLANES.redis.envVar).toBe("REDIS_URL");
    expect(SHARED_PLANES.mongodb.sharedAcrossInstances).toBe(true);
    expect(SHARED_PLANES.mongodb.neverOltpSot).toBe(true);
    expect(SHARED_PLANES.emqx.crossInstanceFanout).toBe(true);
    expect(SCALABILITY_REQUIREMENTS.sharedRedisPostgresMongoEmqx).toBe(true);

    for (const plane of Object.keys(SHARED_PLANES) as Array<
      keyof typeof SHARED_PLANES
    >) {
      expect(() => assertSharedPlane(plane, true)).not.toThrow();
      expect(() => assertSharedPlane(plane, false)).toThrow(/shared/i);
    }
  });

  it("forbids sticky / in-process-only production session, cache, and rate-limit SoT", () => {
    expect(FORBIDDEN_STICKY_STATE.lbStickySessionAffinityRequired).toBe(false);
    expect(FORBIDDEN_STICKY_STATE.databaseSessionStore).toBe(false);
    expect(
      FORBIDDEN_STICKY_STATE.inProcessOnlyRateLimitAsSoleProductionPath,
    ).toBe(false);
    expect(
      FORBIDDEN_STICKY_STATE.inProcessOnlyBusinessCacheAsSoleProductionPath,
    ).toBe(false);
    expect(ALLOWED_PROCESS_LOCAL.dbConnectionPools).toBe(true);
    expect(ALLOWED_PROCESS_LOCAL.mayNotStoreSessionIdentity).toBe(true);

    expect(() =>
      assertNoInProcessOnlyProductionPath({
        rateLimitSolePath: "redis",
        businessCacheSolePath: "redis",
      }),
    ).not.toThrow();
    expect(() =>
      assertNoInProcessOnlyProductionPath({
        rateLimitSolePath: "memory",
        businessCacheSolePath: "redis",
      }),
    ).toThrow(/rate limit/i);
    expect(() =>
      assertNoInProcessOnlyProductionPath({
        rateLimitSolePath: "redis",
        businessCacheSolePath: "memory",
      }),
    ).toThrow(/cache/i);
  });

  it("cross-checks ADR-033 JWT, ADR-051 shared Redis, ADR-004/067 stateless scale-out", () => {
    expect(SESSION_BINDING.strategy).toBe("jwt");
    expect(SESSION_BINDING.databaseSessionStore).toBe("forbidden");
    expect(NEXTAUTH_JWT_DECISION.strategy).toBe("jwt");
    expect(NEXTAUTH_JWT_DECISION.databaseSessionStore).toBe("forbidden");
    expect(REDIS_REQUIREMENTS.sharedAcrossInstances).toBe(true);
    expect(DEPLOYABLE.processModel).toBe("stateless_node");
    expect(TWELVE_FACTOR_RULES.statelessProcess).toBe(true);
    expect(TWELVE_FACTOR_RULES.scaleOutReady).toBe(true);

    expect(SCALABILITY_STATELESS.alignsWith.jwtStrategy).toBe("jwt");
    expect(SCALABILITY_STATELESS.alignsWith.redisSharedAcrossInstances).toBe(
      true,
    );
    expect(SCALABILITY_STATELESS.alignsWith.modularMonolithProcessModel).toBe(
      "stateless_node",
    );

    expect(() => assertJwtSessionModel("jwt")).not.toThrow();
    expect(() => assertJwtSessionModel("database")).toThrow(/JWT/i);
  });

  it("requires portable JWT claims so any instance can authorize the same session", () => {
    expect(() =>
      assertPortableJwtClaims({
        sub: "user-1",
        merchantId: "m-1",
        roles: ["merchant_owner"],
        tokenVersion: 0,
      }),
    ).not.toThrow();
    expect(() =>
      assertPortableJwtClaims({
        sub: "",
        merchantId: null,
        roles: [],
        tokenVersion: 0,
      }),
    ).toThrow(/sub/i);
    expect(() =>
      assertPortableJwtClaims({
        sub: "u",
        merchantId: null,
        roles: "owner" as unknown as string[],
        tokenVersion: 0,
      }),
    ).toThrow(/roles/i);
  });

  it("locks production N≥2 behind LB with health/ready probes", () => {
    expect(PRODUCTION_TOPOLOGY.minAppInstances).toBe(2);
    expect(PRODUCTION_TOPOLOGY.loadBalancerRequired).toBe(true);
    expect(PRODUCTION_TOPOLOGY.stickyAffinityRequired).toBe(false);
    expect(PRODUCTION_TOPOLOGY.healthProbePath).toBe("/api/health");
    expect(PRODUCTION_TOPOLOGY.readyProbePath).toBe("/api/ready");
    expect(PRODUCTION_TOPOLOGY.zeroDowntimeDetailAdr).toBe("ADR-070");

    expect(() => assertProductionMinInstances(2)).not.toThrow();
    expect(() => assertProductionMinInstances(1)).toThrow(/≥ 2|instances/i);
  });

  it("wires auth.config to JWT strategy from the NextAuth contract", () => {
    const authConfigPath = join(root, SESSION_BINDING.authConfigPath);
    expect(existsSync(authConfigPath)).toBe(true);
    const src = readFileSync(authConfigPath, "utf8");
    expect(src).toContain("NEXTAUTH_JWT_DECISION.strategy");
    expect(src).toMatch(/strategy:\s*NEXTAUTH_JWT_DECISION\.strategy/);
    expect(src).not.toMatch(/strategy:\s*["']database["']/);
  });

  it("documents no-sticky horizontal scale and bottleneck mitigations", () => {
    expect(BOTTLENECK_MITIGATIONS.sharedDbBottleneckAcknowledged).toBe(true);
    expect(BOTTLENECK_MITIGATIONS.mitigations).toEqual(
      expect.arrayContaining(["indexes", "cache_aside", "async_projections"]),
    );
    expect(SCALABILITY_UX_NOTES.opsDocsMayBeEnglish).toBe(true);
    expect(SCALABILITY_UX_NOTES.mustNotRegressMobileAssetPerformance).toBe(
      true,
    );

    for (const rel of Object.values(SCALABILITY_DOCS)) {
      const path = join(root, rel);
      expect(existsSync(path)).toBe(true);
      const body = readFileSync(path, "utf8");
      if (rel.includes("non-functional")) {
        expect(body).toMatch(/NFR-02/);
        expect(body).toMatch(/Stateless/i);
      }
      if (rel.includes("deployment-architecture")) {
        expect(body).toMatch(/[Ss]tateless/);
        expect(body).toMatch(/sticky|N ≥ 2|multi-instance/i);
      }
      if (rel.includes("performance-architecture")) {
        expect(body).toMatch(/[Hh]orizontal scale/);
        expect(body).toMatch(/no sticky/i);
      }
      if (rel.includes("zero-downtime")) {
        expect(body).toMatch(/[Ss]tateless|[Jj]WT/);
        expect(body).toMatch(/sticky/i);
      }
    }
  });
});
