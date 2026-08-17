/**
 * In-memory ObjectStoragePort for unit tests (ADR-040).
 * Not for multi-instance production — shared MinIO is required.
 */

import type {
  DeleteObjectParams,
  GetObjectParams,
  ObjectBytes,
  ObjectStoragePort,
  PresignDownloadParams,
  PresignedUrl,
  PresignUploadParams,
  PutObjectParams,
} from "./port.js";

type StoredObject = {
  body: Uint8Array;
  contentType: string;
  metadata: Record<string, string>;
};

type PresignRecord = {
  method: "PUT" | "GET";
  bucket: string;
  objectKey: string;
  contentType?: string;
  metadata?: Record<string, string>;
  expiresAtMs: number;
};

function objectMapKey(bucket: string, objectKey: string): string {
  return `${bucket}\0${objectKey}`;
}

/**
 * In-memory MinIO stand-in. Presigned URLs are opaque tokens
 * (`memory://presign/<token>`) validated by `fulfillPresigned*`.
 */
export class InMemoryObjectStorageAdapter implements ObjectStoragePort {
  private readonly buckets = new Set<string>();
  private readonly objects = new Map<string, StoredObject>();
  private readonly presigns = new Map<string, PresignRecord>();
  private tokenSeq = 0;
  private nowMs: () => number;

  constructor(clock: () => number = () => Date.now()) {
    this.nowMs = clock;
  }

  /** Test helper — advance or pin the clock. */
  setClock(clock: () => number): void {
    this.nowMs = clock;
  }

  clear(): void {
    this.buckets.clear();
    this.objects.clear();
    this.presigns.clear();
    this.tokenSeq = 0;
  }

  async ensureBucket(bucket: string): Promise<void> {
    this.buckets.add(bucket);
  }

  async putObject(params: PutObjectParams): Promise<void> {
    await this.ensureBucket(params.bucket);
    this.objects.set(objectMapKey(params.bucket, params.objectKey), {
      body: new Uint8Array(params.body),
      contentType: params.contentType,
      metadata: { ...(params.metadata ?? {}) },
    });
  }

  async getObject(params: GetObjectParams): Promise<ObjectBytes | null> {
    const stored = this.objects.get(
      objectMapKey(params.bucket, params.objectKey),
    );
    if (!stored) {
      return null;
    }
    return {
      body: new Uint8Array(stored.body),
      contentType: stored.contentType,
      metadata: { ...stored.metadata },
      byteSize: stored.body.byteLength,
    };
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    this.objects.delete(objectMapKey(params.bucket, params.objectKey));
  }

  async createPresignedUploadUrl(
    params: PresignUploadParams,
  ): Promise<PresignedUrl> {
    await this.ensureBucket(params.bucket);
    return this.issuePresign({
      method: "PUT",
      bucket: params.bucket,
      objectKey: params.objectKey,
      contentType: params.contentType,
      ...(params.metadata ? { metadata: { ...params.metadata } } : {}),
      expiresInSeconds: params.expiresInSeconds,
    });
  }

  async createPresignedDownloadUrl(
    params: PresignDownloadParams,
  ): Promise<PresignedUrl> {
    return this.issuePresign({
      method: "GET",
      bucket: params.bucket,
      objectKey: params.objectKey,
      expiresInSeconds: params.expiresInSeconds,
    });
  }

  /**
   * Test / local helper: apply a memory presigned PUT (writes body).
   * Throws when token missing or expired.
   */
  async fulfillPresignedUpload(
    url: string,
    body: Uint8Array,
  ): Promise<void> {
    const record = this.requireLivePresign(url, "PUT");
    await this.putObject({
      bucket: record.bucket,
      objectKey: record.objectKey,
      body,
      contentType: record.contentType ?? "application/octet-stream",
      ...(record.metadata ? { metadata: record.metadata } : {}),
    });
    this.presigns.delete(this.tokenFromUrl(url));
  }

  /**
   * Test / local helper: resolve a memory presigned GET.
   * Throws when token missing or expired.
   */
  async fulfillPresignedDownload(url: string): Promise<ObjectBytes> {
    const record = this.requireLivePresign(url, "GET");
    const obj = await this.getObject({
      bucket: record.bucket,
      objectKey: record.objectKey,
    });
    if (!obj) {
      throw new Error(
        `Presigned download target missing: ${record.bucket}/${record.objectKey}`,
      );
    }
    this.presigns.delete(this.tokenFromUrl(url));
    return obj;
  }

  hasBucket(bucket: string): boolean {
    return this.buckets.has(bucket);
  }

  private issuePresign(input: {
    method: "PUT" | "GET";
    bucket: string;
    objectKey: string;
    contentType?: string;
    metadata?: Record<string, string>;
    expiresInSeconds: number;
  }): PresignedUrl {
    if (
      !Number.isFinite(input.expiresInSeconds) ||
      input.expiresInSeconds <= 0
    ) {
      throw new Error(
        `Presign expiry must be a positive number of seconds (ADR-040); got ${input.expiresInSeconds}.`,
      );
    }
    const token = `t${++this.tokenSeq}`;
    const expiresAtMs = this.nowMs() + input.expiresInSeconds * 1000;
    const record: PresignRecord = {
      method: input.method,
      bucket: input.bucket,
      objectKey: input.objectKey,
      expiresAtMs,
      ...(input.contentType !== undefined
        ? { contentType: input.contentType }
        : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };
    this.presigns.set(token, record);
    return {
      url: `memory://presign/${token}`,
      method: input.method,
      expiresAt: new Date(expiresAtMs),
      bucket: input.bucket,
      objectKey: input.objectKey,
    };
  }

  private tokenFromUrl(url: string): string {
    const prefix = "memory://presign/";
    if (!url.startsWith(prefix)) {
      throw new Error(`Not an in-memory presigned URL: ${url}`);
    }
    return url.slice(prefix.length);
  }

  private requireLivePresign(
    url: string,
    method: "PUT" | "GET",
  ): PresignRecord {
    const token = this.tokenFromUrl(url);
    const record = this.presigns.get(token);
    if (!record) {
      throw new Error("Presigned URL is unknown or already used (ADR-040).");
    }
    if (record.method !== method) {
      throw new Error(
        `Presigned URL method mismatch: expected ${method}, got ${record.method}.`,
      );
    }
    if (record.expiresAtMs <= this.nowMs()) {
      this.presigns.delete(token);
      throw new Error("Presigned URL has expired (ADR-040).");
    }
    return record;
  }
}
