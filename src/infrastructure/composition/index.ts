/**
 * ADR-094 / ADR-123 — application composition root.
 *
 * Production entry: `createAppContext` / `getApiContext`
 * Test entry: `createApiContext({ repos: InMemory* })`
 * Shared Drizzle repos: `createProductionRepositories` / `getSharedProductionRepositories`
 */

export {
  apiReposFromProduction,
  createApiContext,
  createApiContextWithRateLimiter,
  createAppContext,
  createProductionApiContext,
  getApiContext,
  setApiContextForTests,
  type ApiContext,
  type ApiRepositories,
  type CreateApiContextOptions,
} from "./create-api-context.js";

export {
  assertDatabaseUrlForComposition,
  assertProductionCompositionEnv,
  assertProductionPaymentGatewayPolicy,
  assertProductionSmsPolicy,
} from "./production-guards.js";

export {
  getSharedProductionRepositories,
  resetSharedProductionRepositoriesForTests,
} from "./shared-production-repositories.js";

/** Re-export ADR-093 factory so worker/HTTP share one import surface (ADR-123 FR-4). */
export {
  createProductionRepositories,
  createProductionRepositoriesFromDb,
  createProductionRepositoriesFromUrl,
  type ProductionRepositories,
} from "../persistence/create-production-repositories.js";
