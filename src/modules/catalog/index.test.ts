import { describe, expect, it } from "vitest";

import {
  CATALOG_DOMAIN_DECISION,
} from "../../catalog-domain/index.js";
import {
  SEARCH_MESSAGES_FA,
  normalizeBarcode,
} from "../../search-barcode/index.js";
import {
  formatTomanDisplay,
  toToman,
} from "../../shared/domain/money.js";
import {
  CATALOG_ERROR_MESSAGES_FA,
  CatalogDomainError,
  InMemoryCategoryRepository,
  InMemoryProductRepository,
  createCatalogUseCases,
} from "./index.js";

function createHarness() {
  const products = new InMemoryProductRepository();
  const categories = new InMemoryCategoryRepository();
  let n = 0;
  const useCases = createCatalogUseCases({
    products,
    categories,
    idFactory: () => `p-${++n}`,
    now: (() => {
      let t = 1_700_000_000_000;
      return () => new Date(t++);
    })(),
  });
  return { products, categories, useCases };
}

describe("ADR-008 Catalog Domain", () => {
  it("contract: catalog owns Product; barcode merchant-scoped; IRR money", () => {
    expect(CATALOG_DOMAIN_DECISION.ownedAggregates).toContain("Product");
    expect(CATALOG_DOMAIN_DECISION.barcodeUniqueScope).toBe("merchant");
    expect(CATALOG_DOMAIN_DECISION.moneyStorage.displayDefault).toBe("toman");
    expect(CATALOG_DOMAIN_DECISION.searchStrategyAdr).toBe("ADR-050");
  });

  it("creates product with Persian name, IRR price, ProductCreated, تومان display", async () => {
    const { useCases } = createHarness();
    const { product, event, priceDisplayToman } = await useCases.createProduct({
      merchantId: "merchant-1",
      name: "نان بربری",
      sku: "NAN-001",
      barcode: "6260001000001",
      priceAmountMinor: 100_000,
      description: "نان تازه محلی",
    });

    expect(product.name).toBe("نان بربری");
    expect(product.description).toBe("نان تازه محلی");
    expect(product.price.currency).toBe("IRR");
    expect(product.price.amountMinor).toBe(100_000n);
    expect(toToman(product.price)).toBe(10_000n);
    expect(priceDisplayToman).toBe(formatTomanDisplay(product.price));
    expect(priceDisplayToman).toMatch(/تومان/);
    expect(event.eventName).toBe("ProductCreated");
    expect(event.payload.name).toBe("نان بربری");
    expect(event.payload.barcode).toBe("6260001000001");
    expect(event.payload.priceAmountMinor).toBe("100000");
  });

  it("enforces barcode uniqueness per merchant with Persian errors", async () => {
    const { useCases } = createHarness();
    await useCases.createProduct({
      merchantId: "m1",
      name: "شیر",
      sku: "MILK-1",
      barcode: "111",
      priceAmountMinor: 50_000,
    });

    await expect(
      useCases.createProduct({
        merchantId: "m1",
        name: "ماست",
        sku: "YOG-1",
        barcode: "111",
        priceAmountMinor: 40_000,
      }),
    ).rejects.toMatchObject({
      code: "BARCODE_TAKEN",
      messageFa: CATALOG_ERROR_MESSAGES_FA.BARCODE_TAKEN,
    });

    const other = await useCases.createProduct({
      merchantId: "m2",
      name: "شیر دیگر",
      sku: "MILK-1",
      barcode: "111",
      priceAmountMinor: 55_000,
    });
    expect(other.product.merchantId).toBe("m2");

    await expect(
      useCases.createProduct({
        merchantId: "m1",
        name: "   ",
        sku: "X",
        barcode: "222",
        priceAmountMinor: 0,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PRODUCT_NAME" });

    await expect(
      useCases.createProduct({
        merchantId: "m1",
        name: "خوب",
        sku: "OK",
        barcode: "333",
        priceAmountMinor: -1,
      }),
    ).rejects.toBeInstanceOf(CatalogDomainError);

    expect(CATALOG_ERROR_MESSAGES_FA.INVALID_BARCODE).toMatch(
      /[\u0600-\u06FF]/,
    );
  });

  it("creates category and soft-deletes product from default list", async () => {
    const { useCases, products } = createHarness();
    const { category } = await useCases.createCategory({
      merchantId: "m1",
      name: "لبنیات",
    });
    expect(category.name).toBe("لبنیات");

    const created = await useCases.createProduct({
      merchantId: "m1",
      name: "پنیر",
      sku: "CHZ-1",
      barcode: "999",
      priceAmountMinor: 200_000,
      categoryId: category.id,
    });
    expect(created.product.categoryId).toBe(category.id);

    const listed = await products.listByMerchantId("m1");
    expect(listed).toHaveLength(1);

    const deleted = await useCases.softDeleteProductById({
      productId: created.product.id,
    });
    expect(deleted.event.eventName).toBe("ProductDeleted");
    expect(deleted.product.deletedAt).not.toBeNull();

    const after = await products.listByMerchantId("m1");
    expect(after).toHaveLength(0);
    const withDeleted = await products.listByMerchantId("m1", {
      includeDeleted: true,
    });
    expect(withDeleted).toHaveLength(1);
  });
});

describe("ADR-050 Catalog lookupByBarcode / searchByName", () => {
  it("lookupByBarcode resolves tenant-scoped product and folds Persian digits", async () => {
    const { useCases } = createHarness();
    await useCases.createProduct({
      merchantId: "m1",
      name: "دوغ",
      sku: "DOG-1",
      barcode: "6260001000001",
      priceAmountMinor: 30_000,
    });
    await useCases.createProduct({
      merchantId: "m2",
      name: "دوغ دیگر",
      sku: "DOG-1",
      barcode: "6260001000001",
      priceAmountMinor: 35_000,
    });

    const hit = await useCases.lookupByBarcode({
      merchantId: "m1",
      barcode: "۶۲۶۰۰۰۱۰۰۰۰۰۱",
    });
    expect(hit.product?.name).toBe("دوغ");
    expect(hit.product?.merchantId).toBe("m1");
    expect(normalizeBarcode("۶۲۶۰۰۰۱۰۰۰۰۰۱")).toBe("6260001000001");

    const otherTenant = await useCases.lookupByBarcode({
      merchantId: "m2",
      barcode: "6260001000001",
    });
    expect(otherTenant.product?.name).toBe("دوغ دیگر");

    const miss = await useCases.lookupByBarcode({
      merchantId: "m1",
      barcode: "0000000000000",
    });
    expect(miss.product).toBeNull();
    expect(SEARCH_MESSAGES_FA.PRODUCT_NOT_FOUND).toMatch(/[\u0600-\u06FF]/);
  });

  it("searchByName finds Persian product names and respects tenant + soft-delete", async () => {
    const { useCases } = createHarness();
    await useCases.createProduct({
      merchantId: "m1",
      name: "نان بربری",
      sku: "NAN-1",
      barcode: "1001",
      priceAmountMinor: 40_000,
    });
    await useCases.createProduct({
      merchantId: "m1",
      name: "شیر کم‌چرب",
      sku: "MILK-2",
      barcode: "1002",
      priceAmountMinor: 50_000,
    });
    const other = await useCases.createProduct({
      merchantId: "m2",
      name: "نان سنگک",
      sku: "NAN-2",
      barcode: "1003",
      priceAmountMinor: 45_000,
    });

    const faFind = await useCases.searchByName({
      merchantId: "m1",
      query: " نان ",
    });
    expect(faFind.products).toHaveLength(1);
    expect(faFind.products[0]?.name).toBe("نان بربری");

    const milk = await useCases.searchByName({
      merchantId: "m1",
      query: "شیر",
    });
    expect(milk.products.map((p) => p.name)).toEqual(["شیر کم‌چرب"]);

    const noLeak = await useCases.searchByName({
      merchantId: "m1",
      query: "سنگک",
    });
    expect(noLeak.products).toHaveLength(0);
    expect(other.product.merchantId).toBe("m2");

    await useCases.softDeleteProductById({ productId: "p-1" });
    const afterDelete = await useCases.searchByName({
      merchantId: "m1",
      query: "نان",
    });
    expect(afterDelete.products).toHaveLength(0);

    const barcodeGone = await useCases.lookupByBarcode({
      merchantId: "m1",
      barcode: "1001",
    });
    expect(barcodeGone.product).toBeNull();
  });

  it("ADR-147: uploads primary product image to object storage and clears on delete", async () => {
    const { InMemoryObjectStorageAdapter } = await import("../../minio-storage/index.js");
    const objectStorage = new InMemoryObjectStorageAdapter();

    const products = new InMemoryProductRepository();
    const categories = new InMemoryCategoryRepository();
    const useCases = createCatalogUseCases({
      products,
      categories,
      objectStorage,
      idFactory: () => "p-img-1",
    });

    const { product } = await useCases.createProduct({
      merchantId: "m1",
      name: "کالای با تصویر",
      sku: "SKU-IMG-1",
      barcode: "6260009990001",
      priceAmountMinor: 50_000,
    });
    expect(product.imageObjectKey).toBeNull();

    const imageBytes = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
    const uploaded = await useCases.uploadProductImage({
      merchantId: "m1",
      productId: product.id,
      body: imageBytes,
      contentType: "image/png",
    });

    expect(uploaded.product.imageObjectKey).toMatch(/m\/m1\/s\/catalog\/media\//);
    expect(uploaded.product.imageUpdatedAt).toBeInstanceOf(Date);

    const updatedProduct = await products.findById(product.id);
    expect(updatedProduct?.imageObjectKey).toBe(uploaded.objectKey);

    // Rejects invalid image type
    await expect(
      useCases.uploadProductImage({
        merchantId: "m1",
        productId: product.id,
        body: imageBytes,
        contentType: "application/pdf",
      }),
    ).rejects.toThrow(/فرمت تصویر/);

    // Rejects oversized image (> 5MB)
    const largeBytes = new Uint8Array(5 * 1024 * 1024 + 1);
    await expect(
      useCases.uploadProductImage({
        merchantId: "m1",
        productId: product.id,
        body: largeBytes,
        contentType: "image/jpeg",
      }),
    ).rejects.toThrow(/حجم تصویر/);

    // Delete product image
    const deleted = await useCases.deleteProductImage({
      merchantId: "m1",
      productId: product.id,
    });
    expect(deleted.product.imageObjectKey).toBeNull();
  });

  it("ADR-152: product optional costAmountMinor is persisted and validated", async () => {
    const { useCases } = createHarness();
    const { product } = await useCases.createProduct({
      merchantId: "m-cost",
      name: "کالای با قیمت خرید",
      sku: "SKU-COST-1",
      barcode: "6260000000099",
      priceAmountMinor: 100000n, // 10,000 تومان
      costAmountMinor: 70000n, // 7,000 تومان
    });

    expect(product.cost).not.toBeNull();
    expect(product.cost?.amountMinor).toBe(70000n);

    // Negative cost rejected
    await expect(
      useCases.createProduct({
        merchantId: "m-cost",
        name: "کالای قیمت منفی",
        sku: "SKU-COST-BAD",
        barcode: "6260000000098",
        priceAmountMinor: 100000n,
        costAmountMinor: -500n,
      }),
    ).rejects.toBeInstanceOf(CatalogDomainError);
  });
});
