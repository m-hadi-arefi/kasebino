/**
 * Persistence composition — Drizzle production adapters (ADR-093).
 */

export {
  assertProductionRepositoriesForbidInMemory,
} from "./assert-production-repositories.js";
export {
  createProductionRepositories,
  createProductionRepositoriesFromDb,
  createProductionRepositoriesFromUrl,
  type ProductionRepositories,
} from "./create-production-repositories.js";
export {
  DrizzleDeadLetterStore,
  DrizzleOutboxStore,
  DrizzleProcessedSet,
} from "./drizzle-outbox.js";
export {
  assertMerchantId,
  assertStoreId,
  notDeleted,
  parseJsonObject,
} from "./helpers.js";
