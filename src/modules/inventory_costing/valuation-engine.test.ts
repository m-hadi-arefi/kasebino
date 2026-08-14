import { describe, expect, it } from "vitest";
import { CostLayer, CostLayerValuationEngine } from "./index.ts";

describe("CostLayerValuationEngine (FIFO / LIFO / Weighted Average)", () => {
  const sampleLayers: CostLayer[] = [
    {
      id: "layer-1",
      merchantId: "m-01",
      storeId: "s-01",
      productId: "p-01",
      layerDate: "2026-01-10",
      originalQuantity: 3,
      remainingQuantity: 3,
      unitCostMinor: 1000000n, // 100,000 IRR
      unitCode: "piece",
      isDepleted: false,
      createdAt: new Date("2026-01-10"),
      updatedAt: new Date("2026-01-10"),
    },
    {
      id: "layer-2",
      merchantId: "m-01",
      storeId: "s-01",
      productId: "p-01",
      layerDate: "2026-01-15",
      originalQuantity: 2,
      remainingQuantity: 2,
      unitCostMinor: 1200000n, // 120,000 IRR
      unitCode: "piece",
      isDepleted: false,
      createdAt: new Date("2026-01-15"),
      updatedAt: new Date("2026-01-15"),
    },
  ];

  it("calculates FIFO COGS correctly (3 @ 100k + 1 @ 120k = 420k IRR)", () => {
    // Sell 4 units
    const result = CostLayerValuationEngine.allocateConsumption(sampleLayers, 4, "fifo");
    expect(result.totalCogsMinor).toBe(4200000n); // 420,000 IRR
    expect(result.consumptions.length).toBe(2);
    expect(result.consumptions[0].layerId).toBe("layer-1");
    expect(result.consumptions[0].quantityConsumed).toBe(3);
    expect(result.consumptions[1].layerId).toBe("layer-2");
    expect(result.consumptions[1].quantityConsumed).toBe(1);
  });

  it("calculates LIFO COGS correctly (2 @ 120k + 2 @ 100k = 440k IRR)", () => {
    // Sell 4 units
    const result = CostLayerValuationEngine.allocateConsumption(sampleLayers, 4, "lifo");
    expect(result.totalCogsMinor).toBe(4400000n); // 440,000 IRR
    expect(result.consumptions.length).toBe(2);
    expect(result.consumptions[0].layerId).toBe("layer-2");
    expect(result.consumptions[0].quantityConsumed).toBe(2);
    expect(result.consumptions[1].layerId).toBe("layer-1");
    expect(result.consumptions[1].quantityConsumed).toBe(2);
  });

  it("calculates Weighted Average COGS correctly (Avg = (300k+240k)/5 = 108k -> 4 @ 108k = 432k IRR)", () => {
    // Sell 4 units
    const result = CostLayerValuationEngine.allocateConsumption(
      sampleLayers,
      4,
      "weighted_average",
    );
    expect(result.totalCogsMinor).toBe(4320000n); // 432,000 IRR
    expect(result.consumptions.length).toBe(2);
  });

  it("throws exception on insufficient inventory", () => {
    expect(() =>
      CostLayerValuationEngine.allocateConsumption(sampleLayers, 10, "fifo"),
    ).toThrow("Insufficient inventory");
  });
});
