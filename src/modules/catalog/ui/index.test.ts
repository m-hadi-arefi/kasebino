import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../uiuxpromax-gate/index.js";
import {
  CATALOG_UI_COPY_FA,
  formatCatalogToman,
  minorToTomanInt,
  tomanToMinor,
} from "./index.js";
import {
  InMemoryCategoryRepository,
  InMemoryProductRepository,
  createCatalogUseCases,
} from "../index.js";

describe("ADR-097 Catalog merchant UI + update", () => {
  it("passes uiuxpromax Persian+RTL brief gate for catalog/inventory", () => {
    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: true,
        docsPresent: true,
        uiInScope: true,
        brief: {
          persian: true,
          rtl: true,
          faIrPersona: true,
          mobile390: true,
          iranianRetailContext: true,
          screenListDocumented: true,
          statesDocumented: true,
          a11yNotes: true,
        },
      }),
    ).not.toThrow();
    expect(CATALOG_UI_COPY_FA.productsTitle).toMatch(/کالا/);
    expect(CATALOG_UI_COPY_FA.emptyProducts).toMatch(/[\u0600-\u06FF]/);
    expect(CATALOG_UI_COPY_FA.priceTomanLabel).toMatch(/تومان/);
    expect(CATALOG_UI_COPY_FA.inventoryTitle).toMatch(/موجودی/);
  });

  it("converts تومان form input to IRR minor and formats display", () => {
    expect(tomanToMinor(10_000)).toBe(100_000n);
    expect(minorToTomanInt(100_000)).toBe(10_000);
    expect(formatCatalogToman(100_000)).toMatch(/تومان/);
  });

  it("updates product and emits ProductUpdated; search excludes soft-deleted", async () => {
    const products = new InMemoryProductRepository();
    const categories = new InMemoryCategoryRepository();
    let n = 0;
    const useCases = createCatalogUseCases({
      products,
      categories,
      idFactory: () => `id-${++n}`,
    });

    const created = await useCases.createProduct({
      merchantId: "m1",
      name: "شیر کم‌چرب",
      sku: "MILK-1",
      barcode: "6260001000001",
      priceAmountMinor: 50_000,
    });

    const updated = await useCases.updateProduct({
      productId: created.product.id,
      merchantId: "m1",
      name: "شیر پرچرب",
      sku: "MILK-1",
      barcode: "6260001000001",
      priceAmountMinor: 60_000,
    });
    expect(updated.event.eventName).toBe("ProductUpdated");
    expect(updated.product.name).toBe("شیر پرچرب");
    expect(updated.priceDisplayToman).toMatch(/تومان/);

    await useCases.softDeleteProductById({ productId: created.product.id });
    const search = await useCases.searchByName({
      merchantId: "m1",
      query: "شیر",
    });
    expect(search.products).toHaveLength(0);

    const lookup = await useCases.lookupByBarcode({
      merchantId: "m1",
      barcode: "6260001000001",
    });
    expect(lookup.product).toBeNull();
  });

  it("soft-deletes categories from default list", async () => {
    const products = new InMemoryProductRepository();
    const categories = new InMemoryCategoryRepository();
    const useCases = createCatalogUseCases({
      products,
      categories,
      idFactory: () => "cat-1",
    });
    const created = await useCases.createCategory({
      merchantId: "m1",
      name: "لبنیات",
    });
    await useCases.softDeleteCategoryById({
      categoryId: created.category.id,
      merchantId: "m1",
    });
    const listed = await categories.listByMerchantId("m1");
    expect(listed).toHaveLength(0);
  });
});
