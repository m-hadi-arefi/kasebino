/**
 * S3-compatible object storage port (ADR-040).
 * Adapters: MinIO (compose) or in-memory (tests). Binaries never live in PostgreSQL —
 * only object keys/refs are persisted in OLTP.
 */

/** S3/MinIO bucket names — each must be ≥3 chars (AWS naming rules). */
export type ObjectBucket = "receipts" | "media" | "qrcodes";

export type ObjectBytes = {
  body: Uint8Array;
  contentType: string;
  /** UTF-8-safe metadata map (values already decoded where applicable). */
  metadata: Readonly<Record<string, string>>;
  byteSize: number;
};

export type PutObjectParams = {
  bucket: ObjectBucket | string;
  objectKey: string;
  body: Uint8Array;
  contentType: string;
  /** Optional user metadata; Persian filenames go through UTF-8 helpers. */
  metadata?: Readonly<Record<string, string>>;
};

export type GetObjectParams = {
  bucket: ObjectBucket | string;
  objectKey: string;
};

export type DeleteObjectParams = {
  bucket: ObjectBucket | string;
  objectKey: string;
};

export type PresignUploadParams = {
  bucket: ObjectBucket | string;
  objectKey: string;
  contentType: string;
  /** Seconds until the URL expires. */
  expiresInSeconds: number;
  byteSize?: number;
  metadata?: Readonly<Record<string, string>>;
};

export type PresignDownloadParams = {
  bucket: ObjectBucket | string;
  objectKey: string;
  expiresInSeconds: number;
};

export type PresignedUrl = {
  url: string;
  method: "PUT" | "GET";
  expiresAt: Date;
  bucket: string;
  objectKey: string;
};

/** Thin object-storage port — no full AWS SDK surface. */
export type ObjectStoragePort = {
  ensureBucket(bucket: ObjectBucket | string): Promise<void>;
  putObject(params: PutObjectParams): Promise<void>;
  getObject(params: GetObjectParams): Promise<ObjectBytes | null>;
  deleteObject(params: DeleteObjectParams): Promise<void>;
  createPresignedUploadUrl(
    params: PresignUploadParams,
  ): Promise<PresignedUrl>;
  createPresignedDownloadUrl(
    params: PresignDownloadParams,
  ): Promise<PresignedUrl>;
};
