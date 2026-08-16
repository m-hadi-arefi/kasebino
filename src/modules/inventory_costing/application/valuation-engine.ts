/**
 * Inventory Valuation Engine (FIFO / LIFO / Weighted Average) (MerchantOS Phase 2).
 */

import type { AllocationResult, CostLayer, ValuationMethod } from "../domain/cost-layer.js";

export class CostLayerValuationEngine {
  /**
   * Allocate requested consumption quantity from available active cost layers.
   */
  static allocateConsumption(
    layers: readonly CostLayer[],
    quantityNeeded: number,
    method: ValuationMethod = "fifo",
  ): AllocationResult {
    if (quantityNeeded <= 0) {
      return { totalCogsMinor: 0n, consumptions: [] };
    }

    const available = layers.filter((l) => !l.isDepleted && l.remainingQuantity > 0);
    if (available.length === 0) {
      throw new Error("Insufficient inventory: No active cost layers available");
    }

    const totalAvailableQty = available.reduce((acc, l) => acc + l.remainingQuantity, 0);
    if (totalAvailableQty < quantityNeeded) {
      throw new Error(
        `Insufficient inventory cost layers: requested ${quantityNeeded}, available ${totalAvailableQty}`,
      );
    }

    if (method === "fifo" || method === "lifo") {
      const sorted = [...available].sort((a, b) => {
        const timeA = new Date(a.layerDate).getTime();
        const timeB = new Date(b.layerDate).getTime();
        return method === "fifo" ? timeA - timeB : timeB - timeA;
      });

      let remainingToAllocate = quantityNeeded;
      let totalCogsMinor = 0n;
      const consumptions: {
        layerId: string;
        quantityConsumed: number;
        unitCostMinor: bigint;
        totalCostMinor: bigint;
      }[] = [];

      for (const layer of sorted) {
        if (remainingToAllocate <= 0) break;
        const consumeFromThisLayer = Math.min(layer.remainingQuantity, remainingToAllocate);
        const costForThis = BigInt(Math.round(consumeFromThisLayer)) * layer.unitCostMinor;

        consumptions.push({
          layerId: layer.id,
          quantityConsumed: consumeFromThisLayer,
          unitCostMinor: layer.unitCostMinor,
          totalCostMinor: costForThis,
        });

        totalCogsMinor += costForThis;
        remainingToAllocate -= consumeFromThisLayer;
      }

      return { totalCogsMinor, consumptions };
    }

    // Weighted Average
    const totalValueMinor = available.reduce(
      (acc, l) => acc + BigInt(Math.round(l.remainingQuantity)) * l.unitCostMinor,
      0n,
    );
    const avgUnitCostMinor = totalValueMinor / BigInt(Math.round(totalAvailableQty));

    let remainingToAllocate = quantityNeeded;
    let totalCogsMinor = 0n;
    const consumptions: {
      layerId: string;
      quantityConsumed: number;
      unitCostMinor: bigint;
      totalCostMinor: bigint;
    }[] = [];

    for (const layer of available) {
      if (remainingToAllocate <= 0) break;
      const consumeFromThisLayer = Math.min(layer.remainingQuantity, remainingToAllocate);
      const costForThis = BigInt(Math.round(consumeFromThisLayer)) * avgUnitCostMinor;

      consumptions.push({
        layerId: layer.id,
        quantityConsumed: consumeFromThisLayer,
        unitCostMinor: avgUnitCostMinor,
        totalCostMinor: costForThis,
      });

      totalCogsMinor += costForThis;
      remainingToAllocate -= consumeFromThisLayer;
    }

    return { totalCogsMinor, consumptions };
  }
}
