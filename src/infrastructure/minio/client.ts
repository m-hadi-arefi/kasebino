/**
 * Thin MinIO connection stub (ADR-040).
 *
 * Resolves endpoint + credentials from env. Does not open an S3 session
 * at import time. Object operations use `ObjectStoragePort`
 * (`src/minio-storage`). Prefer module-owned adapters when wiring a real
 * AWS/MinIO SDK client later (docs/tech/minio.md).
 */

import { CONNECTION } from "../../minio-storage/index.js";

export type MinioConnectionConfig = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  endpointEnv: typeof CONNECTION.endpointEnv;
  accessKeyEnv: typeof CONNECTION.accessKeyEnv;
  secretKeyEnv: typeof CONNECTION.secretKeyEnv;
};

/**
 * Resolve MinIO config from explicit values (tests / DI).
 */
export function createMinioConfig(input: {
  endpoint: string;
  accessKey: string;
  secretKey: string;
}): MinioConnectionConfig {
  const endpoint = input.endpoint.trim();
  const accessKey = input.accessKey.trim();
  const secretKey = input.secretKey.trim();

  if (!endpoint) {
    throw new Error(
      `${CONNECTION.endpointEnv} must be a non-empty URL (ADR-040).`,
    );
  }
  if (!/^https?:\/\//i.test(endpoint)) {
    throw new Error(
      `${CONNECTION.endpointEnv} must use http:// or https:// (ADR-040); got "${endpoint}".`,
    );
  }
  if (!accessKey) {
    throw new Error(
      `${CONNECTION.accessKeyEnv} must be non-empty (ADR-040).`,
    );
  }
  if (!secretKey) {
    throw new Error(
      `${CONNECTION.secretKeyEnv} must be non-empty (ADR-040).`,
    );
  }

  return {
    endpoint,
    accessKey,
    secretKey,
    endpointEnv: CONNECTION.endpointEnv,
    accessKeyEnv: CONNECTION.accessKeyEnv,
    secretKeyEnv: CONNECTION.secretKeyEnv,
  };
}

/**
 * Build MinIO connection config from process env.
 * Requires MINIO_ENDPOINT + MINIO_ROOT_USER + MINIO_ROOT_PASSWORD.
 * Optional MINIO_ACCESS_KEY / MINIO_SECRET_KEY override root keys when set.
 */
export function createMinioConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): MinioConnectionConfig {
  const endpoint = env[CONNECTION.endpointEnv];
  const accessKey =
    env[CONNECTION.optionalAccessAliasEnv]?.trim() ||
    env[CONNECTION.accessKeyEnv];
  const secretKey =
    env[CONNECTION.optionalSecretAliasEnv]?.trim() ||
    env[CONNECTION.secretKeyEnv];

  if (!endpoint) {
    throw new Error(
      `${CONNECTION.endpointEnv} is required for the MinIO client stub (ADR-040).`,
    );
  }
  if (!accessKey) {
    throw new Error(
      `${CONNECTION.accessKeyEnv} (or ${CONNECTION.optionalAccessAliasEnv}) is required for the MinIO client stub (ADR-040).`,
    );
  }
  if (!secretKey) {
    throw new Error(
      `${CONNECTION.secretKeyEnv} (or ${CONNECTION.optionalSecretAliasEnv}) is required for the MinIO client stub (ADR-040).`,
    );
  }

  return createMinioConfig({ endpoint, accessKey, secretKey });
}
