/**
 * Live MinIO S3-compatible ObjectStoragePort (ADR-111).
 * Uses AWS SDK v3 against MinIO endpoint (path-style, forcePathStyle).
 */

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  DeleteObjectParams,
  GetObjectParams,
  ObjectBytes,
  ObjectStoragePort,
  PresignDownloadParams,
  PresignedUrl,
  PresignUploadParams,
  PutObjectParams,
} from "./contracts/port.js";
import type { MinioConnectionConfig } from "./client.js";

function toUint8Array(body: unknown): Uint8Array {
  if (body == null) return new Uint8Array();
  if (body instanceof Uint8Array) return body;
  if (Buffer.isBuffer(body)) return new Uint8Array(body);
  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }
  throw new Error("Unsupported S3 object body type (ADR-111).");
}

async function streamToUint8Array(
  body: AsyncIterable<Uint8Array> | ReadableStream | Uint8Array | undefined,
): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  if (body instanceof Uint8Array) return body;
  const chunks: Uint8Array[] = [];
  // AWS SDK Node runtime yields an async iterable of buffers.
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function metadataFromS3(
  meta: Record<string, string> | undefined,
): Record<string, string> {
  if (!meta) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

export class MinioObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;

  constructor(config: MinioConnectionConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  async ensureBucket(bucket: string): Promise<void> {
    const name = bucket.trim();
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: name }));
      return;
    } catch {
      // create when missing
    }
    await this.client.send(new CreateBucketCommand({ Bucket: name }));
  }

  async putObject(params: PutObjectParams): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.objectKey,
        Body: Buffer.from(params.body),
        ContentType: params.contentType,
        ...(params.metadata
          ? { Metadata: { ...params.metadata } }
          : {}),
      }),
    );
  }

  async getObject(params: GetObjectParams): Promise<ObjectBytes | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({
          Bucket: params.bucket,
          Key: params.objectKey,
        }),
      );
      const body = await streamToUint8Array(
        res.Body as AsyncIterable<Uint8Array> | undefined,
      );
      return {
        body,
        contentType: res.ContentType ?? "application/octet-stream",
        metadata: metadataFromS3(res.Metadata),
        byteSize: body.byteLength,
      };
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: unknown }).name)
          : "";
      if (
        name === "NoSuchKey" ||
        name === "NotFound" ||
        name === "NoSuchBucket"
      ) {
        return null;
      }
      throw err;
    }
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: params.bucket,
        Key: params.objectKey,
      }),
    );
  }

  async createPresignedUploadUrl(
    params: PresignUploadParams,
  ): Promise<PresignedUrl> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.objectKey,
      ContentType: params.contentType,
      ...(params.metadata ? { Metadata: { ...params.metadata } } : {}),
    });
    const expiresIn = Math.floor(params.expiresInSeconds);
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      method: "PUT",
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      bucket: params.bucket,
      objectKey: params.objectKey,
    };
  }

  async createPresignedDownloadUrl(
    params: PresignDownloadParams,
  ): Promise<PresignedUrl> {
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.objectKey,
    });
    const expiresIn = Math.floor(params.expiresInSeconds);
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      method: "GET",
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      bucket: params.bucket,
      objectKey: params.objectKey,
    };
  }

  /** Test helper — dispose underlying HTTP sockets. */
  destroy(): void {
    this.client.destroy();
  }
}

/** @internal — expose byte helper for tests without exporting SDK types. */
export function minioBodyToUint8Array(body: unknown): Uint8Array {
  return toUint8Array(body);
}
