import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  COMPOSE_DATA_PLANES,
  COMPOSE_FILES,
  COMPOSE_SERVICE_PORTS,
  extractComposeServiceNames,
} from "../docker-compose-parity/index.js";
import {
  createMinioConfig,
  createMinioConfigFromEnv,
} from "../infrastructure/minio/client.js";
import {
  BUCKET_POLICY,
  CONNECTION,
  FORBIDDEN_STORAGE,
  MINIO_BUCKET_LIST,
  MINIO_BUCKETS,
  MINIO_ENGINE,
  MINIO_ENV_KEYS,
  MINIO_REQUIREMENTS,
  MINIO_STORAGE,
  OBJECT_LIMITS,
  ObjectValidationError,
  PLACEMENT,
  UNICODE_METADATA_SAFETY,
  InMemoryObjectStorageAdapter,
  assertKnownBucket,
  assertMinioEndpointEnvKey,
  assertMinioRole,
  assertNeverDbBlobs,
  assertPrivateBucketsDefault,
  assertUtf8FilenameMetadataRoundTrip,
  buildObjectKey,
  createReceiptRef,
  createValidatedPresignedDownload,
  createValidatedPresignedUpload,
  decodeFilenameMetadata,
  encodeFilenameMetadata,
  putValidatedObject,
  validateObjectConstraints,
} from "./index.js";

const root = process.cwd();

describe("ADR-040 File Storage MinIO Strategy", () => {
  it("locks MinIO as S3-compatible object storage (never DB BLOBs)", () => {
    expect(MINIO_ENGINE.name).toBe("minio");
    expect(MINIO_ENGINE.role).toBe("s3_compatible_files");
    expect(MINIO_ENGINE.plane).toBe("object_storage");
    expect(MINIO_ENGINE.api).toBe("s3");
    expect(MINIO_ENGINE.neverDbBlobs).toBe(true);
    expect(MINIO_ENGINE.keysStoredInPostgresql).toBe(true);
    expect(MINIO_REQUIREMENTS.s3CompatibleApi).toBe(true);
    expect(MINIO_REQUIREMENTS.keysInPostgresqlNotBlobs).toBe(true);
    expect(FORBIDDEN_STORAGE.dbBlobsForReceiptsMediaQr).toBe(false);

    expect(COMPOSE_DATA_PLANES.minio.role).toBe("s3_compatible_files");
    expect(MINIO_STORAGE.alignsWith.composeMinioRole).toBe(
      COMPOSE_DATA_PLANES.minio.role,
    );

    expect(() => assertMinioRole("s3_compatible_files")).not.toThrow();
    expect(() => assertMinioRole("oltp_source_of_truth")).toThrow(
      /s3_compatible_files/i,
    );
    expect(() => assertNeverDbBlobs(false)).not.toThrow();
    expect(() => assertNeverDbBlobs(true)).toThrow(/BLOB/i);
    expect(() => assertPrivateBucketsDefault(true)).not.toThrow();
    expect(() => assertPrivateBucketsDefault(false)).toThrow(/private/i);
    expect(BUCKET_POLICY.privateByDefault).toBe(true);
    expect(BUCKET_POLICY.accessViaPresignedUrls).toBe(true);
  });

  it("documents MinIO env keys in .env.example and compose wiring", () => {
    expect(CONNECTION.endpointEnv).toBe("MINIO_ENDPOINT");
    expect(CONNECTION.accessKeyEnv).toBe("MINIO_ROOT_USER");
    expect(CONNECTION.secretKeyEnv).toBe("MINIO_ROOT_PASSWORD");
    expect(MINIO_ENV_KEYS).toContain("MINIO_ENDPOINT");
    expect(MINIO_ENV_KEYS).toContain("MINIO_ROOT_USER");
    expect(MINIO_ENV_KEYS).toContain("MINIO_ROOT_PASSWORD");

    expect(() => assertMinioEndpointEnvKey("MINIO_ENDPOINT")).not.toThrow();
    expect(() => assertMinioEndpointEnvKey("MINIO_URL")).toThrow(
      /MINIO_ENDPOINT/i,
    );

    const envPath = join(root, COMPOSE_FILES.envExample);
    expect(existsSync(envPath)).toBe(true);
    const env = readFileSync(envPath, "utf8");
    expect(env).toMatch(/^MINIO_ENDPOINT=/m);
    expect(env).toMatch(/^MINIO_ROOT_USER=/m);
    expect(env).toMatch(/^MINIO_ROOT_PASSWORD=/m);
    expect(env).toMatch(/^MINIO_API_PORT=/m);
    expect(env).toMatch(/^MINIO_CONSOLE_PORT=/m);
    expect(env).toMatch(/^MINIO_CONSOLE_URL=/m);
    expect(env).toContain("http://localhost:9000");
  });

  it("verifies compose ships minio object-storage plane", () => {
    const composePath = join(root, COMPOSE_FILES.compose);
    expect(existsSync(composePath)).toBe(true);
    const yaml = readFileSync(composePath, "utf8");
    const names = extractComposeServiceNames(yaml);

    expect(names).toContain("minio");
    expect(yaml).toMatch(/^\s*minio:\s*$/m);
    expect(yaml).toContain("MINIO_ENDPOINT");
    expect(yaml).toContain("http://minio:9000");
    expect(yaml).toContain("minio/minio");
    expect(yaml).toContain("minio_data");
    expect(yaml).toContain("console-address");
    expect(COMPOSE_SERVICE_PORTS.minio).toEqual([9000, 9001]);
    expect(COMPOSE_DATA_PLANES.minio.plane).toBe("object_storage");
    expect(MINIO_ENGINE.apiPort).toBe(9000);
    expect(MINIO_ENGINE.consolePort).toBe(9001);
  });

  it("defines private receipts/media/qrcodes buckets with type/size limits", () => {
    expect(MINIO_BUCKETS).toEqual({
      receipts: "receipts",
      media: "media",
      qr: "qrcodes",
    });
    expect([...MINIO_BUCKET_LIST]).toEqual(["receipts", "media", "qrcodes"]);
    expect(OBJECT_LIMITS.receipts.maxBytes).toBe(5 * 1024 * 1024);
    expect(OBJECT_LIMITS.media.maxBytes).toBe(2 * 1024 * 1024);
    expect(OBJECT_LIMITS.qrcodes.maxBytes).toBe(512 * 1024);

    expect(() => assertKnownBucket("receipts")).not.toThrow();
    expect(() => assertKnownBucket("public")).toThrow(ObjectValidationError);

    expect(() =>
      validateObjectConstraints({
        bucket: "media",
        contentType: "image/png",
        byteSize: 100,
      }),
    ).not.toThrow();

    expect(() =>
      validateObjectConstraints({
        bucket: "media",
        contentType: "application/pdf",
        byteSize: 100,
      }),
    ).toThrow(/Content-Type/);

    expect(() =>
      validateObjectConstraints({
        bucket: "qrcodes",
        contentType: "image/png",
        byteSize: OBJECT_LIMITS.qrcodes.maxBytes + 1,
      }),
    ).toThrow(/exceeds max/);
  });

  it("round-trips objects via in-memory adapter and validated put", async () => {
    const store = new InMemoryObjectStorageAdapter();
    const body = new TextEncoder().encode("%PDF-receipt");
    await putValidatedObject(store, {
      bucket: MINIO_BUCKETS.receipts,
      objectKey: "m/merchant-1/receipts/sale-1.pdf",
      body,
      contentType: "application/pdf",
    });

    const got = await store.getObject({
      bucket: MINIO_BUCKETS.receipts,
      objectKey: "m/merchant-1/receipts/sale-1.pdf",
    });
    expect(got).not.toBeNull();
    expect(got!.contentType).toBe("application/pdf");
    expect(got!.byteSize).toBe(body.byteLength);
    expect(new TextDecoder().decode(got!.body)).toBe("%PDF-receipt");

    await store.deleteObject({
      bucket: MINIO_BUCKETS.receipts,
      objectKey: "m/merchant-1/receipts/sale-1.pdf",
    });
    expect(
      await store.getObject({
        bucket: MINIO_BUCKETS.receipts,
        objectKey: "m/merchant-1/receipts/sale-1.pdf",
      }),
    ).toBeNull();
  });

  it("issues presigned upload/download URLs and rejects expiry", async () => {
    let now = 1_000_000;
    const store = new InMemoryObjectStorageAdapter(() => now);
    const body = new Uint8Array([1, 2, 3, 4]);

    const upload = await createValidatedPresignedUpload(store, {
      bucket: MINIO_BUCKETS.media,
      objectKey: "m/m1/media/product.png",
      contentType: "image/png",
      byteSize: body.byteLength,
      expiresInSeconds: 60,
    });
    expect(upload.method).toBe("PUT");
    expect(upload.url).toMatch(/^memory:\/\/presign\//);

    await store.fulfillPresignedUpload(upload.url, body);

    const download = await createValidatedPresignedDownload(store, {
      bucket: MINIO_BUCKETS.media,
      objectKey: "m/m1/media/product.png",
      expiresInSeconds: 30,
    });
    expect(download.method).toBe("GET");
    const fetched = await store.fulfillPresignedDownload(download.url);
    expect(Array.from(fetched.body)).toEqual([1, 2, 3, 4]);

    const expired = await createValidatedPresignedDownload(store, {
      bucket: MINIO_BUCKETS.media,
      objectKey: "m/m1/media/product.png",
      expiresInSeconds: 10,
    });
    now += 11_000;
    await expect(store.fulfillPresignedDownload(expired.url)).rejects.toThrow(
      /expired/i,
    );
  });

  it("preserves Persian (fa) filenames via UTF-8 metadata encoding", () => {
    const faName = "رسید-فروش-۱۴۰۳.pdf";
    expect(/[\u0600-\u06FF]/.test(faName)).toBe(true);

    const encoded = encodeFilenameMetadata(faName);
    expect(encoded[UNICODE_METADATA_SAFETY.filenameMetadataKey]).toBeTruthy();
    expect(encoded[UNICODE_METADATA_SAFETY.charsetMetadataKey]).toBe("utf-8");
    expect(decodeFilenameMetadata(encoded)).toBe(faName);
    expect(() => assertUtf8FilenameMetadataRoundTrip(faName)).not.toThrow();

    const key = buildObjectKey({
      merchantId: "merchant-fa",
      storeId: "store-1",
      kind: "receipts",
      filename: faName,
    });
    expect(key).toContain("m/merchant-fa/");
    expect(key).toContain("s/store-1/");
    expect(key).toContain(faName);
    expect(key).not.toMatch(/\\u0/);
  });

  it("builds ReceiptRef VO only for receipts bucket constraints", () => {
    const ref = createReceiptRef({
      objectKey: "m/m1/receipts/sale.pdf",
      contentType: "application/pdf",
      byteSize: 2048,
    });
    expect(ref.bucket).toBe("receipts");
    expect(ref.objectKey).toBe("m/m1/receipts/sale.pdf");

    expect(() =>
      createReceiptRef({
        objectKey: "   ",
        contentType: "application/pdf",
        byteSize: 10,
      }),
    ).toThrow(/objectKey/);

    expect(() =>
      createReceiptRef({
        objectKey: "k",
        contentType: "text/plain",
        byteSize: 10,
      }),
    ).toThrow(/contentType/);

    expect(() =>
      createReceiptRef({
        objectKey: "k",
        contentType: "application/pdf",
        byteSize: OBJECT_LIMITS.receipts.maxBytes + 1,
      }),
    ).toThrow(/byteSize/);
  });

  it("resolves thin MinIO client stub from env", () => {
    expect(PLACEMENT.clientStub).toBe("src/infrastructure/minio/client.ts");
    expect(PLACEMENT.package).toBe("src/minio-storage/");

    const cfg = createMinioConfig({
      endpoint: "http://localhost:9000",
      accessKey: "minioadmin",
      secretKey: "minioadmin",
    });
    expect(cfg.endpoint).toBe("http://localhost:9000");
    expect(cfg.endpointEnv).toBe("MINIO_ENDPOINT");

    expect(() =>
      createMinioConfig({
        endpoint: "localhost:9000",
        accessKey: "a",
        secretKey: "b",
      }),
    ).toThrow(/http:\/\//i);

    expect(() => createMinioConfigFromEnv({})).toThrow(/MINIO_ENDPOINT/);

    const fromEnv = createMinioConfigFromEnv({
      MINIO_ENDPOINT: "http://minio:9000",
      MINIO_ROOT_USER: "minioadmin",
      MINIO_ROOT_PASSWORD: "minioadmin",
    });
    expect(fromEnv.endpoint).toBe("http://minio:9000");

    const aliased = createMinioConfigFromEnv({
      MINIO_ENDPOINT: "http://minio:9000",
      MINIO_ROOT_USER: "root",
      MINIO_ROOT_PASSWORD: "rootpass",
      MINIO_ACCESS_KEY: "ak",
      MINIO_SECRET_KEY: "sk",
    });
    expect(aliased.accessKey).toBe("ak");
    expect(aliased.secretKey).toBe("sk");
  });
});
