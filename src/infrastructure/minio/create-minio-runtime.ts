/**
 * ADR-111 — compose MinIO object-storage runtime from MINIO_ENDPOINT.
 *
 * Live path: Compose `minio` + MINIO_* env → S3 SDK adapter.
 * Mock path: MOS_MINIO_MODE=memory → InMemoryObjectStorageAdapter (tests).
 */

import {
  InMemoryObjectStorageAdapter,
  MINIO_BUCKET_LIST,
  type ObjectStoragePort,
} from "./contracts/index.js";
import {
  createMinioConfigFromEnv,
  type MinioConnectionConfig,
} from "./client.js";
import { MinioObjectStorageAdapter } from "./minio-object-storage-adapter.js";

export type MinioRuntimeMode = "minio" | "memory";

export type MinioRuntime = {
  mode: MinioRuntimeMode;
  storage: ObjectStoragePort;
  config?: MinioConnectionConfig;
  /** Resolves when buckets ensured (or immediately for memory). */
  ready: Promise<void>;
};

function wantsMemoryMode(env: NodeJS.ProcessEnv): boolean {
  const mode = env.MOS_MINIO_MODE?.trim().toLowerCase();
  return mode === "memory" || mode === "mock";
}

async function ensureMvpBuckets(storage: ObjectStoragePort): Promise<void> {
  for (const bucket of MINIO_BUCKET_LIST) {
    await storage.ensureBucket(bucket);
  }
}

/**
 * Build object-storage runtime.
 * - MOS_MINIO_MODE=memory|mock → in-memory (documented mock path)
 * - else requires MINIO_ENDPOINT (+ credentials) → live MinIO adapter
 */
export function createMinioRuntime(
  env: NodeJS.ProcessEnv = process.env,
): MinioRuntime {
  if (wantsMemoryMode(env) || !env.MINIO_ENDPOINT?.trim()) {
    const storage = new InMemoryObjectStorageAdapter();
    const ready = ensureMvpBuckets(storage);
    return {
      mode: "memory",
      storage,
      ready,
    };
  }

  const config = createMinioConfigFromEnv(env);
  const storage = new MinioObjectStorageAdapter(config);
  const ready = ensureMvpBuckets(storage);
  return {
    mode: "minio",
    storage,
    config,
    ready,
  };
}

/**
 * HEAD-ish ping: ensure receipts bucket. Returns false when env missing or error.
 */
export async function pingMinioFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (!env.MINIO_ENDPOINT?.trim()) return false;
  try {
    const config = createMinioConfigFromEnv(env);
    const adapter = new MinioObjectStorageAdapter(config);
    await adapter.ensureBucket("receipts");
    adapter.destroy();
    return true;
  } catch {
    return false;
  }
}

let singleton: MinioRuntime | null = null;

export function getMinioRuntime(
  env: NodeJS.ProcessEnv = process.env,
): MinioRuntime {
  if (!singleton) {
    singleton = createMinioRuntime(env);
  }
  return singleton;
}

/** Test escape hatch. */
export function setMinioRuntimeForTests(runtime: MinioRuntime | null): void {
  singleton = runtime;
}
