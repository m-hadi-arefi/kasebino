import { describe, expect, it } from "vitest";
import {
  InMemoryStockOperationsRepository,
  ProcessWasteUseCase,
} from "./index.js";

describe("Inventory Operations (Stock Counting, Waste & Transfers)", () => {
  it("creates and completes physical stock count calculating expected vs actual variance", async () => {
    const repo = new InMemoryStockOperationsRepository();
    const merchantId = "m-01";
    const storeId = "s-01";

    const count = await repo.createStockCount({
      merchantId,
      storeId,
      countNumber: "CNT-2026-001",
      countDate: "2026-02-12",
      items: [
        { productId: "p-01", expectedQuantity: 100 },
        { productId: "p-02", expectedQuantity: 50 },
      ],
    });

    expect(count.status).toBe("in_progress");

    const completed = await repo.completeStockCount({
      merchantId,
      countId: count.id,
      itemCounts: [
        { productId: "p-01", actualQuantity: 95, varianceReason: "ضایعات پلاستیک" },
        { productId: "p-02", actualQuantity: 52, varianceReason: "اضافی موجودی" },
      ],
    });

    expect(completed.status).toBe("completed");
    expect(completed.items[0]?.variance).toBe(-5); // 95 - 100
    expect(completed.items[1]?.variance).toBe(2); // 52 - 50
  });

  it("records inventory waste/shrinkage with financial value calculation", async () => {
    const repo = new InMemoryStockOperationsRepository();
    const wasteUC = new ProcessWasteUseCase(repo);

    const waste = await wasteUC.execute({
      merchantId: "m-01",
      storeId: "s-01",
      productId: "p-01",
      quantity: 3,
      unitCostMinor: 1500000n, // 150,000 IRR
      reason: "spoilage",
      notes: "خرابی تاریخ انقضا",
    });

    expect(waste.id).toBeDefined();
    expect(waste.totalValueMinor).toBe(4500000n); // 450,000 IRR
  });

  it("creates inter-store stock transfer", async () => {
    const repo = new InMemoryStockOperationsRepository();

    const transfer = await repo.createStockTransfer({
      merchantId: "m-01",
      fromStoreId: "s-01",
      toStoreId: "s-02",
      transferNumber: "TRF-001",
      items: [{ productId: "p-01", quantity: 10 }],
    });

    expect(transfer.status).toBe("in_transit");
    expect(transfer.items.length).toBe(1);
  });
});
