/**
 * ADR-040 — File Storage MinIO Strategy.
 *
 * MinIO S3 API for receipts / media / QR assets. Presigned upload/download;
 * object keys in PostgreSQL — never DB BLOBs. Private buckets; type/size limits.
 *
 * Compose service shipped by ADR-066. Live S3 SDK adapter: ADR-111
 * (`src/infrastructure/minio/`). In-memory adapter remains test-only.
 *
 * Normative prose: docs/tech/minio.md, docs/architecture/16-storage-architecture.md
 */

import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_SERVICE_PORTS,
} from "../docker-compose-parity/index.js";

import type {
  ObjectBucket,
  ObjectStoragePort,
  PresignDownloadParams,
  PresignUploadParams,
  PutObjectParams,
} from "./port.js";

export type {
  DeleteObjectParams,
  GetObjectParams,
  ObjectBucket,
  ObjectBytes,
  ObjectStoragePort,
  PresignDownloadParams,
  PresignedUrl,
  PresignUploadParams,
  PutObjectParams,
} from "./port.js";
export { InMemoryObjectStorageAdapter } from "./in-memory-adapter.js";

/** Engine identity — S3-compatible object storage (compose MinIO). */
export const MINIO_ENGINE = {
  name: "minio",
  role: "s3_compatible_files",
  plane: "object_storage",
  api: "s3" as const,
  composePorts: COMPOSE_SERVICE_PORTS.minio,
  apiPort: COMPOSE_SERVICE_PORTS.minio[0],
  consolePort: COMPOSE_SERVICE_PORTS.minio[1],
  soleSourceOfTruthForBinaries: true,
  neverDbBlobs: true,
  keysStoredInPostgresql: true,
} as const;

/**
 * MVP buckets (ADR-040 + store-first QR).
 * Aligns ADR prose products→media, merchantdocs QR assets→qrcodes.
 * Physical name `qrcodes` (not `qr`) — S3 requires ≥3-char bucket names.
 */
export const MINIO_BUCKETS = {
  receipts: "receipts",
  media: "media",
  qr: "qrcodes",
} as const satisfies Record<string, ObjectBucket>;

export type MinioBucketName =
  (typeof MINIO_BUCKETS)[keyof typeof MINIO_BUCKETS];

export const MINIO_BUCKET_LIST = [
  MINIO_BUCKETS.receipts,
  MINIO_BUCKETS.media,
  MINIO_BUCKETS.qr,
] as const;

/** Private by default — no public-read ACL on MVP buckets. */
export const BUCKET_POLICY = {
  privateByDefault: true,
  publicReadForbiddenWithoutReview: true,
  accessViaPresignedUrls: true,
} as const;

/**
 * Type / size limits (ADR-040 Security Impact).
 * Media limits sized for Iranian Android-class catalog browsing.
 */
export const OBJECT_LIMITS = {
  receipts: {
    maxBytes: 5 * 1024 * 1024,
    allowedContentTypes: [
      "application/pdf",
      "text/html",
      "image/png",
      "image/jpeg",
      "image/webp",
    ] as const,
  },
  media: {
    maxBytes: 2 * 1024 * 1024,
    /** No SVG — XSS risk when served inline as logos (ADR-111). */
    allowedContentTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ] as const,
  },
  qrcodes: {
    maxBytes: 512 * 1024,
    allowedContentTypes: ["image/png", "image/svg+xml"] as const,
  },
} as const;

/** Default presign TTLs (seconds). */
export const PRESIGN_TTL_SECONDS = {
  upload: 900,
  download: 600,
} as const;

/**
 * Connection env keys — documented in `.env.example` (ADR-066 / ADR-068).
 * S3 access/secret map to MinIO root user/password for local parity.
 */
export const CONNECTION = {
  endpointEnv: "MINIO_ENDPOINT",
  accessKeyEnv: "MINIO_ROOT_USER",
  secretKeyEnv: "MINIO_ROOT_PASSWORD",
  consoleUrlEnv: "MINIO_CONSOLE_URL",
  apiPortEnv: "MINIO_API_PORT",
  consolePortEnv: "MINIO_CONSOLE_PORT",
  documentedIn: [COMPOSE_FILES.envExample, COMPOSE_FILES.compose] as const,
  /** Optional future aliases for dedicated IAM-style keys (not required MVP). */
  optionalAccessAliasEnv: "MINIO_ACCESS_KEY",
  optionalSecretAliasEnv: "MINIO_SECRET_KEY",
} as const;

export const MINIO_ENV_KEYS = [
  CONNECTION.endpointEnv,
  CONNECTION.accessKeyEnv,
  CONNECTION.secretKeyEnv,
  CONNECTION.consoleUrlEnv,
  CONNECTION.apiPortEnv,
  CONNECTION.consolePortEnv,
] as const;

export const PLACEMENT = {
  package: "src/minio-storage/",
  port: "src/minio-storage/port.ts",
  inMemoryAdapter: "src/minio-storage/in-memory-adapter.ts",
  clientStub: "src/infrastructure/minio/client.ts",
  liveAdapter: "src/infrastructure/minio/minio-object-storage-adapter.ts",
  runtime: "src/infrastructure/minio/create-minio-runtime.ts",
  techFolderConvention: "src/shared/infrastructure/storage",
  composeService: "minio",
  storageArchitectureDoc: "docs/architecture/16-storage-architecture.md",
  techDoc: "docs/tech/minio.md",
} as const;

/**
 * Iranian First — object metadata must carry Persian (fa) filenames as UTF-8
 * without mojibake. S3 user-metadata historically prefers ASCII; we store
 * base64url(UTF-8) plus an explicit charset marker.
 */
export const UNICODE_METADATA_SAFETY = {
  preserveUtf8PersianFilenames: true,
  filenameMetadataKey: "original-filename-b64",
  charsetMetadataKey: "original-filename-charset",
  charsetValue: "utf-8",
  noAsciiScrubOfFaFilenames: true,
} as const;

export const MINIO_REQUIREMENTS = {
  s3CompatibleApi: true,
  presignedUploadDownload: true,
  keysInPostgresqlNotBlobs: true,
  privateBucketsDefault: true,
  typeAndSizeLimits: true,
  composeMinioFromAdr066: true,
  utf8FaFilenameMetadata: true,
  /** ADR-040 contract only; live SDK lands in ADR-111. */
  noAwsSdkRequiredInThisAdr: false,
  liveS3SdkInAdr111: true,
  inMemoryAdapterTestOnly: true,
} as const;

/** Forbidden storage practices. */
export const FORBIDDEN_STORAGE = {
  dbBlobsForReceiptsMediaQr: false,
  publicBucketsWithoutReview: false,
  secretsInObjectMetadata: false,
} as const;

/**
 * ReceiptRef VO — object pointer for sale receipts (ADR-040 Domain Impact).
 * Persist this in PG; binary lives in MinIO `receipts` bucket.
 */
export type ReceiptRef = {
  bucket: typeof MINIO_BUCKETS.receipts;
  objectKey: string;
  contentType: string;
  byteSize: number;
};

export type CreateReceiptRefInput = {
  objectKey: string;
  contentType: string;
  byteSize: number;
};

export function createReceiptRef(input: CreateReceiptRefInput): ReceiptRef {
  const objectKey = input.objectKey.trim();
  if (!objectKey) {
    throw new Error("ReceiptRef.objectKey must be non-empty (ADR-040).");
  }
  if (
    !(OBJECT_LIMITS.receipts.allowedContentTypes as readonly string[]).includes(
      input.contentType,
    )
  ) {
    throw new Error(
      `ReceiptRef contentType not allowed (ADR-040): ${input.contentType}`,
    );
  }
  if (
    !Number.isFinite(input.byteSize) ||
    input.byteSize <= 0 ||
    input.byteSize > OBJECT_LIMITS.receipts.maxBytes
  ) {
    throw new Error(
      `ReceiptRef.byteSize out of range (ADR-040); max ${OBJECT_LIMITS.receipts.maxBytes}.`,
    );
  }
  return {
    bucket: MINIO_BUCKETS.receipts,
    objectKey,
    contentType: input.contentType,
    byteSize: input.byteSize,
  };
}

export function isMinioBucket(name: string): name is MinioBucketName {
  return (MINIO_BUCKET_LIST as readonly string[]).includes(name);
}

/**
 * Merchant-scoped object key. Tenant isolation at key layout
 * (bucket ACLs + authZ remain caller responsibility).
 */
export function buildObjectKey(parts: {
  merchantId: string;
  storeId?: string;
  kind: ObjectBucket;
  filename: string;
}): string {
  const merchantId = parts.merchantId.trim();
  const filename = parts.filename.trim();
  if (!merchantId) {
    throw new Error("objectKey requires merchantId (ADR-040 / ADR-048).");
  }
  if (!filename) {
    throw new Error("objectKey requires filename (ADR-040).");
  }
  // Path segment: keep Unicode filename; do not ASCII-scrub Persian.
  const safeName = filename.replace(/[/\\]/g, "_");
  const storeSegment = parts.storeId?.trim()
    ? `s/${parts.storeId.trim()}/`
    : "";
  return `m/${merchantId}/${storeSegment}${parts.kind}/${safeName}`;
}

/**
 * Encode a display filename (may be Persian) into S3-safe user metadata.
 */
export function encodeFilenameMetadata(
  filename: string,
): Record<string, string> {
  const trimmed = filename.trim();
  if (!trimmed) {
    throw new Error("filename metadata requires a non-empty name (ADR-040).");
  }
  const b64 = Buffer.from(trimmed, "utf8").toString("base64url");
  return {
    [UNICODE_METADATA_SAFETY.filenameMetadataKey]: b64,
    [UNICODE_METADATA_SAFETY.charsetMetadataKey]:
      UNICODE_METADATA_SAFETY.charsetValue,
  };
}

/**
 * Decode filename from metadata produced by `encodeFilenameMetadata`.
 * Returns null when keys are missing.
 */
export function decodeFilenameMetadata(
  metadata: Readonly<Record<string, string>>,
): string | null {
  const b64 = metadata[UNICODE_METADATA_SAFETY.filenameMetadataKey];
  if (!b64) {
    return null;
  }
  const charset =
    metadata[UNICODE_METADATA_SAFETY.charsetMetadataKey] ??
    UNICODE_METADATA_SAFETY.charsetValue;
  if (charset.toLowerCase() !== "utf-8") {
    throw new Error(
      `Unsupported filename charset "${charset}" (ADR-040 expects utf-8).`,
    );
  }
  return Buffer.from(b64, "base64url").toString("utf8");
}

export type ObjectValidationErrorCode =
  | "unknown_bucket"
  | "content_type_not_allowed"
  | "size_exceeded"
  | "empty_body";

export class ObjectValidationError extends Error {
  readonly code: ObjectValidationErrorCode;

  constructor(code: ObjectValidationErrorCode, message: string) {
    super(message);
    this.name = "ObjectValidationError";
    this.code = code;
  }
}

export function assertKnownBucket(bucket: string): asserts bucket is MinioBucketName {
  if (!isMinioBucket(bucket)) {
    throw new ObjectValidationError(
      "unknown_bucket",
      `Unknown MinIO bucket "${bucket}" (ADR-040); expected receipts|media|qrcodes.`,
    );
  }
}

export function validateObjectConstraints(input: {
  bucket: string;
  contentType: string;
  byteSize: number;
}): void {
  assertKnownBucket(input.bucket);
  const limits = OBJECT_LIMITS[input.bucket];
  if (!(limits.allowedContentTypes as readonly string[]).includes(input.contentType)) {
    throw new ObjectValidationError(
      "content_type_not_allowed",
      `Content-Type "${input.contentType}" not allowed for bucket "${input.bucket}" (ADR-040).`,
    );
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    throw new ObjectValidationError(
      "empty_body",
      `Object byteSize must be a positive number (ADR-040); got ${input.byteSize}.`,
    );
  }
  if (input.byteSize > limits.maxBytes) {
    throw new ObjectValidationError(
      "size_exceeded",
      `Object exceeds max ${limits.maxBytes} bytes for bucket "${input.bucket}" (ADR-040).`,
    );
  }
}

/**
 * Put with type/size validation — preferred entry for application services.
 */
export async function putValidatedObject(
  port: ObjectStoragePort,
  params: PutObjectParams & { bucket: MinioBucketName },
): Promise<void> {
  validateObjectConstraints({
    bucket: params.bucket,
    contentType: params.contentType,
    byteSize: params.body.byteLength,
  });
  await port.ensureBucket(params.bucket);
  await port.putObject(params);
}

export async function createValidatedPresignedUpload(
  port: ObjectStoragePort,
  params: PresignUploadParams & { bucket: MinioBucketName; byteSize: number },
): Promise<Awaited<ReturnType<ObjectStoragePort["createPresignedUploadUrl"]>>> {
  validateObjectConstraints({
    bucket: params.bucket,
    contentType: params.contentType,
    byteSize: params.byteSize,
  });
  await port.ensureBucket(params.bucket);
  return port.createPresignedUploadUrl(params);
}

export async function createValidatedPresignedDownload(
  port: ObjectStoragePort,
  params: PresignDownloadParams & { bucket: MinioBucketName },
): Promise<
  Awaited<ReturnType<ObjectStoragePort["createPresignedDownloadUrl"]>>
> {
  assertKnownBucket(params.bucket);
  return port.createPresignedDownloadUrl(params);
}

export function assertPrivateBucketsDefault(
  privateByDefault: boolean,
): void {
  if (!privateByDefault || !BUCKET_POLICY.privateByDefault) {
    throw new Error(
      "MinIO buckets must be private by default (ADR-040).",
    );
  }
}

export function assertNeverDbBlobs(storesBlobsInPostgres: boolean): void {
  if (storesBlobsInPostgres) {
    throw new Error(
      "Must not store receipt/media/QR binaries as PostgreSQL BLOBs (ADR-040); use MinIO keys.",
    );
  }
  if (!MINIO_ENGINE.neverDbBlobs || !MINIO_ENGINE.keysStoredInPostgresql) {
    throw new Error("MINIO_ENGINE blob/key policy violated (ADR-040).");
  }
}

export function assertMinioRole(role: string): void {
  if (role !== MINIO_ENGINE.role) {
    throw new Error(
      `MinIO role must be "${MINIO_ENGINE.role}" (ADR-040); got "${role}".`,
    );
  }
  if (COMPOSE_DATA_PLANES.minio.role !== MINIO_ENGINE.role) {
    throw new Error(
      "Compose minio plane role must match s3_compatible_files (ADR-040 / ADR-066).",
    );
  }
}

export function assertMinioEndpointEnvKey(envVar: string): void {
  if (envVar !== CONNECTION.endpointEnv) {
    throw new Error(
      `MinIO endpoint env var must be "${CONNECTION.endpointEnv}" (ADR-040); got "${envVar}".`,
    );
  }
}

export function assertUtf8FilenameMetadataRoundTrip(filename: string): void {
  const encoded = encodeFilenameMetadata(filename);
  const decoded = decodeFilenameMetadata(encoded);
  if (decoded !== filename.trim()) {
    throw new Error(
      "UTF-8 filename metadata round-trip failed (ADR-040 Iranian First).",
    );
  }
  if (!UNICODE_METADATA_SAFETY.preserveUtf8PersianFilenames) {
    throw new Error(
      "UNICODE_METADATA_SAFETY.preserveUtf8PersianFilenames must be true (ADR-040).",
    );
  }
}

export const MINIO_STORAGE = {
  engine: MINIO_ENGINE,
  buckets: MINIO_BUCKETS,
  bucketList: MINIO_BUCKET_LIST,
  bucketPolicy: BUCKET_POLICY,
  objectLimits: OBJECT_LIMITS,
  presignTtlSeconds: PRESIGN_TTL_SECONDS,
  connection: CONNECTION,
  envKeys: MINIO_ENV_KEYS,
  placement: PLACEMENT,
  unicodeMetadataSafety: UNICODE_METADATA_SAFETY,
  forbidden: FORBIDDEN_STORAGE,
  requirements: MINIO_REQUIREMENTS,
  alignsWith: {
    composeMinioPlane: COMPOSE_DATA_PLANES.minio.plane,
    composeMinioRole: COMPOSE_DATA_PLANES.minio.role,
  },
} as const;
