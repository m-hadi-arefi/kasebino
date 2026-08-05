/**
 * ADR-093 — production composition never selects InMemory* adapters.
 */

import { describe, expect, it } from "vitest";

import { assertProductionRepositoriesForbidInMemory } from "./assert-production-repositories.js";
import { createProductionRepositoriesFromDb } from "./create-production-repositories.js";
import { InMemoryMerchantRepository } from "../../modules/merchant/infrastructure/persistence/in-memory-merchant-repository.js";
import type { DrizzleDb } from "../database/drizzle/client.js";

describe("ADR-093 production repositories forbid InMemory", () => {
  it("createProductionRepositoriesFromDb exports only Drizzle* adapters", () => {
    const fakeDb = {} as DrizzleDb;
    const repos = createProductionRepositoriesFromDb(fakeDb);
    const adapters = { ...repos };
    delete (adapters as { db?: unknown }).db;
    assertProductionRepositoriesForbidInMemory(adapters);

    for (const [key, value] of Object.entries(adapters)) {
      const name = (value as { constructor: { name: string } }).constructor
        .name;
      expect(name.startsWith("Drizzle"), `${key}=${name}`).toBe(true);
    }
  });

  it("assertProductionRepositoriesForbidInMemory rejects InMemory*", () => {
    expect(() =>
      assertProductionRepositoriesForbidInMemory({
        merchants: new InMemoryMerchantRepository(),
      }),
    ).toThrow(/InMemoryMerchantRepository/);
  });
});
