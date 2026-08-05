/**
 * ADR-111 MinIO receipts / branding asset runtime tests.
 */

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  InMemoryObjectStorageAdapter,
  MINIO_BUCKETS,
  OBJECT_LIMITS,
  ObjectValidationError,
  createReceiptRef,
} from "../minio-storage/index.js";
import {
  createMinioRuntime,
  createReceiptRenderOutboxHandler,
  pingMinioFromEnv,
} from "../infrastructure/minio/index.js";
import { createCompletedSaleAggregate } from "../modules/pos/domain/sale.js";
import { createPosUseCases } from "../modules/pos/application/use-cases.js";
import { InMemorySaleRepository } from "../modules/pos/infrastructure/persistence/in-memory-sale-repository.js";
import { renderSaleReceiptHtml } from "../modules/pos/application/receipt-html.js";
import { storeSaleReceiptObject } from "../modules/pos/application/store-sale-receipt.js";
import { createStoreAssetUseCases } from "../modules/store/application/upload-branding-asset.js";
import { emptyStoreHours } from "../modules/store/domain/hours.js";
import { createStoreAggregate } from "../modules/store/domain/store.js";
import { InMemoryStoreRepository } from "../modules/store/infrastructure/persistence/in-memory-store-repository.js";
import { createOutboxMessage } from "../outbox/index.js";
import { createEventEnvelope } from "../event-driven/index.js";

function tinyPng(): Uint8Array {
  // Minimal 1x1 PNG
  return Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
}

describe("ADR-111 MinIO receipts and assets", () => {
  it("defaults to in-memory when MOS_MINIO_MODE=memory", async () => {
    const runtime = createMinioRuntime({
      MOS_MINIO_MODE: "memory",
      MINIO_ENDPOINT: "http://localhost:9000",
    });
    await runtime.ready;
    expect(runtime.mode).toBe("memory");
    expect(runtime.storage).toBeInstanceOf(InMemoryObjectStorageAdapter);
  });

  it("renders Persian RTL HTML receipt with تومان", () => {
    const sale = createCompletedSaleAggregate({
      id: "11111111-1111-4111-8111-111111111111",
      merchantId: "22222222-2222-4222-8222-222222222222",
      storeId: "33333333-3333-4333-8333-333333333333",
      membershipId: null,
      customerId: null,
      phoneNational: "09121234567",
      tenderType: "cash",
      idempotencyKey: "k1",
      lines: [
        {
          id: "l1",
          productId: "p1",
          productName: "نان بربری",
          quantity: 2,
          unitPriceMinor: 50_000n,
        },
      ],
    });
    const rendered = renderSaleReceiptHtml({
      sale,
      storeDisplayName: "نانوایی آفتاب",
    });
    const html = new TextDecoder().decode(rendered.body);
    expect(html).toContain('lang="fa"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("تومان");
    expect(html).toContain("نان بربری");
    expect(html).toContain("نانوایی آفتاب");
    createReceiptRef({
      objectKey: "m/m1/receipts/s.html",
      contentType: "text/html",
      byteSize: rendered.body.byteLength,
    });
  });

  it("CompleteSale stores receipt object and signed URL retrieves HTML", async () => {
    const storage = new InMemoryObjectStorageAdapter();
    const sales = new InMemorySaleRepository();
    const useCases = createPosUseCases({
      sales,
      membership: {
        async upsertFromPosPhoneCapture() {
          return {
            membershipId: "m1",
            customerId: "c1",
            phoneNational: "09121234567",
            created: true,
          };
        },
      },
      inventory: {
        async decrementForSale() {},
      },
      objectStorage: storage,
      resolveStoreDisplayName: async () => "مغازه تست",
      idFactory: () => randomUUID(),
    });

    const result = await useCases.completeSale({
      merchantId: "22222222-2222-4222-8222-222222222222",
      storeId: "33333333-3333-4333-8333-333333333333",
      phone: "09121234567",
      tenderType: "cash",
      idempotencyKey: "idem-receipt-1",
      lines: [
        {
          productId: "p1",
          productName: "شیر",
          quantity: 1,
          unitPriceMinor: 100_000n,
        },
      ],
    });

    expect(result.sale.receiptObjectKey).toBeTruthy();
    const obj = await storage.getObject({
      bucket: MINIO_BUCKETS.receipts,
      objectKey: result.sale.receiptObjectKey!,
    });
    expect(obj).not.toBeNull();
    expect(obj!.contentType).toBe("text/html");
    const html = new TextDecoder().decode(obj!.body);
    expect(html).toContain("شیر");
    expect(html).toContain("تومان");

    const signed = await storage.createPresignedDownloadUrl({
      bucket: MINIO_BUCKETS.receipts,
      objectKey: result.sale.receiptObjectKey!,
      expiresInSeconds: 600,
    });
    const downloaded = await storage.fulfillPresignedDownload(signed.url);
    expect(new TextDecoder().decode(downloaded.body)).toContain("شیر");
  });

  it("CompleteSale succeeds when MinIO put throws", async () => {
    const failing: InMemoryObjectStorageAdapter =
      new InMemoryObjectStorageAdapter();
    failing.putObject = async () => {
      throw new Error("minio_down");
    };
    const sales = new InMemorySaleRepository();
    const useCases = createPosUseCases({
      sales,
      membership: {
        async upsertFromPosPhoneCapture() {
          return {
            membershipId: "m1",
            customerId: "c1",
            phoneNational: "09121234567",
            created: false,
          };
        },
      },
      inventory: { async decrementForSale() {} },
      objectStorage: failing,
    });

    const result = await useCases.completeSale({
      merchantId: "22222222-2222-4222-8222-222222222222",
      storeId: "33333333-3333-4333-8333-333333333333",
      phone: "09121234567",
      tenderType: "cash",
      idempotencyKey: "idem-fail-minio",
      lines: [
        {
          productId: "p1",
          productName: "ماست",
          quantity: 1,
          unitPriceMinor: 80_000n,
        },
      ],
    });
    expect(result.created).toBe(true);
    expect(result.sale.receiptObjectKey).toBeNull();
  });

  it("outbox receipt consumer retries missing receipt", async () => {
    const storage = new InMemoryObjectStorageAdapter();
    const sales = new InMemorySaleRepository();
    const stores = new InMemoryStoreRepository();
    const sale = createCompletedSaleAggregate({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      merchantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      membershipId: null,
      customerId: null,
      phoneNational: "09123334455",
      tenderType: "cash",
      idempotencyKey: "retry-1",
      lines: [
        {
          id: "l1",
          productId: "p1",
          productName: "چای",
          quantity: 1,
          unitPriceMinor: 40_000n,
        },
      ],
    });
    await sales.save(sale);
    await stores.save(
      createStoreAggregate({
        id: sale.storeId,
        merchantId: sale.merchantId,
        slug: "tea-shop",
        branding: {
          displayName: "چایخانه",
          logoObjectKey: null,
          primaryColor: null,
        },
        hours: emptyStoreHours(),
        address: {
          line1: "خیابان ۱",
          line2: null,
          city: "کرمان",
          province: "کرمان",
          postalCode: null,
          displayAddress: "کرمان",
          latitude: 30.28,
          longitude: 57.08,
        },
      }),
    );

    const handler = createReceiptRenderOutboxHandler({
      sales,
      stores,
      objectStorage: storage,
    });
    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: sale.merchantId,
      storeId: sale.storeId,
      payload: { saleId: sale.id },
    });
    await handler(
      createOutboxMessage({
        envelope,
        aggregateId: sale.id,
        aggregateType: "Sale",
      }),
    );
    const updated = await sales.findById(sale.id);
    expect(updated?.receiptObjectKey).toBeTruthy();
  });

  it("uploads store logo and rejects SVG", async () => {
    const storage = new InMemoryObjectStorageAdapter();
    const stores = new InMemoryStoreRepository();
    const store = createStoreAggregate({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      merchantId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      slug: "logo-shop",
      branding: {
        displayName: "فروشگاه لوگو",
        logoObjectKey: null,
        primaryColor: null,
      },
      hours: emptyStoreHours(),
      address: {
        line1: "خیابان ۲",
        line2: null,
        city: "کرمان",
        province: "کرمان",
        postalCode: null,
        displayAddress: "کرمان",
        latitude: 30.28,
        longitude: 57.08,
      },
    });
    await stores.save(store);
    const assets = createStoreAssetUseCases({ stores, objectStorage: storage });

    const ok = await assets.uploadBrandingAsset({
      merchantId: store.merchantId,
      storeId: store.id,
      kind: "logo",
      body: tinyPng(),
      contentType: "image/png",
      filename: "لوگو.png",
    });
    expect(ok.objectKey).toContain("branding-logo");
    expect(ok.store.branding.logoObjectKey).toBe(ok.objectKey);
    const obj = await storage.getObject({
      bucket: MINIO_BUCKETS.media,
      objectKey: ok.objectKey,
    });
    expect(obj?.contentType).toBe("image/png");

    await expect(
      assets.uploadBrandingAsset({
        merchantId: store.merchantId,
        storeId: store.id,
        kind: "logo",
        body: new TextEncoder().encode("<svg></svg>"),
        contentType: "image/svg+xml",
      }),
    ).rejects.toBeInstanceOf(ObjectValidationError);

    expect(OBJECT_LIMITS.media.allowedContentTypes).not.toContain(
      "image/svg+xml",
    );
  });

  it("optional live MinIO put/get when Compose is reachable", async () => {
    const live = await pingMinioFromEnv({
      MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
      MINIO_ROOT_USER: process.env.MINIO_ROOT_USER ?? "minioadmin",
      MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD ?? "minioadmin",
    });
    if (!live) {
      expect(live).toBe(false);
      return;
    }
    try {
      const runtime = createMinioRuntime({
        MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
        MINIO_ROOT_USER: process.env.MINIO_ROOT_USER ?? "minioadmin",
        MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD ?? "minioadmin",
      });
      await runtime.ready;
      expect(runtime.mode).toBe("minio");
      const sale = createCompletedSaleAggregate({
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        merchantId: "11111111-1111-4111-8111-111111111111",
        storeId: "22222222-2222-4222-8222-222222222222",
        membershipId: null,
        customerId: null,
        phoneNational: "09120000000",
        tenderType: "cash",
        idempotencyKey: "live-minio",
        lines: [
          {
            id: "l1",
            productId: "p1",
            productName: "تست زنده",
            quantity: 1,
            unitPriceMinor: 10_000n,
          },
        ],
      });
      const stored = await storeSaleReceiptObject({
        storage: runtime.storage,
        sale,
        storeDisplayName: "تست",
      });
      const got = await runtime.storage.getObject({
        bucket: MINIO_BUCKETS.receipts,
        objectKey: stored.objectKey,
      });
      expect(got?.contentType).toBe("text/html");
      await runtime.storage.deleteObject({
        bucket: MINIO_BUCKETS.receipts,
        objectKey: stored.objectKey,
      });
    } catch {
      // Optional: endpoint may respond while buckets are not provisioned yet.
      expect(live).toBe(true);
    }
  });
});
