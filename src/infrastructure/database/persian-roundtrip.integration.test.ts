/**
 * ADR-092 — optional live Postgres Persian UTF-8 round-trip.
 * Runs only when DATABASE_URL is set (local Compose / CI with services).
 */

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { merchants } from "./schema/merchants.js";

const databaseUrl = process.env.DATABASE_URL;

describe.runIf(Boolean(databaseUrl))(
  "ADR-092 Persian UTF-8 round-trip (live Postgres)",
  () => {
    it("inserts and selects Persian trade_name without mojibake", async () => {
      const client = postgres(databaseUrl!, { max: 1 });
      const db = drizzle(client);
      const id = randomUUID();
      const tradeName = "فروشگاه کاشانو کرمان";
      const now = new Date();

      try {
        await db.insert(merchants).values({
          id,
          tradeName,
          slug: `fa-test-${id.slice(0, 8)}`,
          status: "draft",
          ownerUserId: randomUUID(),
          multiStoreEnabled: true,
          createdAt: now,
          updatedAt: now,
        });

        const rows = await db
          .select({ tradeName: merchants.tradeName })
          .from(merchants)
          .where(eq(merchants.id, id));

        expect(rows[0]?.tradeName).toBe(tradeName);
      } finally {
        await db.delete(merchants).where(eq(merchants.id, id));
        await client.end({ timeout: 5 });
      }
    });
  },
);
