/**
 * ADR-123 — route handler integration via createAppContext + live Postgres.
 * Runs only when DATABASE_URL is set (Compose / CI).
 */

import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import type { AuthSessionSnapshot } from "../auth/session-guard.js";
import { handleCreateMerchant } from "../http/handlers/merchants-stores.js";
import {
  createAppContext,
  getSharedProductionRepositories,
  resetSharedProductionRepositoriesForTests,
  setApiContextForTests,
} from "./index.js";

const databaseUrl = process.env.DATABASE_URL;

type SqlClient = { end: (opts?: { timeout?: number }) => Promise<void> };

function getClient(db: unknown): SqlClient | undefined {
  return (db as { $client?: SqlClient }).$client;
}

function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
): {
  method: string;
  url: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
} {
  const payload = body === undefined ? "" : JSON.stringify(body);
  return {
    method,
    url,
    headers: {
      get() {
        return null;
      },
    },
    async json() {
      return JSON.parse(payload) as unknown;
    },
    async text() {
      return payload;
    },
  };
}

afterEach(() => {
  setApiContextForTests(null);
  resetSharedProductionRepositoriesForTests();
});

describe.runIf(Boolean(databaseUrl))(
  "ADR-123 createAppContext route handler (live Postgres)",
  () => {
    it("handleCreateMerchant uses composition with Drizzle repos", async () => {
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        DATABASE_URL: databaseUrl,
        MOS_ENV: "local",
        MOS_REDIS_MODE: "memory",
        MOS_MONGO_MODE: "memory",
        MOS_MINIO_MODE: "memory",
      };

      const ctx = createAppContext(env);
      const ownerUserId = randomUUID();
      const slug = `c123-${ownerUserId.slice(0, 8)}`;
      const session: AuthSessionSnapshot = {
        audience: "merchant",
        roles: ["merchant_owner"],
        user: {
          id: ownerUserId,
          roles: ["merchant_owner"],
          audience: "merchant",
        },
      };

      try {
        const result = await handleCreateMerchant(
          jsonRequest("POST", "/api/v1/merchants", {
            tradeName: "فروشگاه ترکیب ریشه",
            slug,
            contactPhone: "09121234567",
          }),
          ctx,
          session,
        );

        expect(result.status).toBe(201);
        const body = result.body as {
          data?: { merchant?: { tradeName?: string; slug?: string } };
        };
        expect(body.data?.merchant?.tradeName).toBe("فروشگاه ترکیب ریشه");
        expect(body.data?.merchant?.slug).toBe(slug);

        const loaded = await ctx.repos.merchants.findBySlug(slug);
        expect(loaded?.tradeName).toBe("فروشگاه ترکیب ریشه");
        expect(ctx.outbox).toBeDefined();
        expect(ctx.catalog).toBeDefined();
        expect(ctx.pos).toBeDefined();
      } finally {
        const sql = getClient(getSharedProductionRepositories(env).db);
        await sql?.end({ timeout: 5 }).catch(() => undefined);
      }
    });
  },
);
