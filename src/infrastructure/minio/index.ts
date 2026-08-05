/**
 * ADR-111 MinIO infrastructure exports.
 */

export {
  createMinioConfig,
  createMinioConfigFromEnv,
  type MinioConnectionConfig,
} from "./client.js";
export {
  createMinioRuntime,
  getMinioRuntime,
  pingMinioFromEnv,
  setMinioRuntimeForTests,
  type MinioRuntime,
  type MinioRuntimeMode,
} from "./create-minio-runtime.js";
export { MinioObjectStorageAdapter } from "./minio-object-storage-adapter.js";
export { createReceiptRenderOutboxHandler } from "./receipt-render-outbox-handler.js";
