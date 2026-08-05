/**
 * MongoDB analytics infrastructure — live client + plane adapters (ADR-110).
 */

export {
  connectMongoClient,
  createMongoClient,
  createMongoClientConnecting,
  createMongodbConfig,
  createMongodbConfigFromEnv,
  pingMongoFromEnv,
  resolveMongodbDatabaseName,
  type MerchantOsMongoClient,
  type MongodbConnectionConfig,
} from "./client.js";
export {
  createMongoRuntime,
  getMongoRuntime,
  resolveMongoRuntimeMode,
  setMongoRuntimeForTests,
  type MongoRuntime,
  type MongoRuntimeMode,
} from "./create-mongo-runtime.js";
export {
  ensureAnalyticsIndexes,
  listTtlIndexes,
  type EnsuredIndex,
} from "./ensure-indexes.js";
export { MongodbAuditStore } from "./mongodb-audit-store.js";
export { MongodbClickstreamStore } from "./mongodb-clickstream-store.js";
export { MongodbEventWarehouseStore } from "./mongodb-event-warehouse-store.js";
export { MongodbProductAnalyticsStore } from "./mongodb-product-analytics-store.js";
export { MongodbSessionStore } from "./mongodb-session-store.js";
export { trackPosFunnelStep, type PosFunnelStep } from "./pos-funnel-track.js";
