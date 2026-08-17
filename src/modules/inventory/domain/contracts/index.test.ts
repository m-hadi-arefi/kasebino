import { describe, expect, it } from "vitest";

import {
  INVENTORY_CACHE,
  INVENTORY_DOMAIN,
  INVENTORY_DOMAIN_DECISION,
  STOCK_ADJUSTED_EVENT,
} from "./index.js";

describe("ADR-008 Inventory Domain contract", () => {
  it("requires store-scoped StockItem and StockAdjusted event", () => {
    expect(INVENTORY_DOMAIN_DECISION.ownedAggregate).toBe("StockItem");
    expect(INVENTORY_DOMAIN_DECISION.scope).toBe("store");
    expect(INVENTORY_DOMAIN_DECISION.identityKeys).toEqual([
      "merchantId",
      "storeId",
      "productId",
    ]);
    expect(INVENTORY_DOMAIN_DECISION.mvpAllowsNegativeQuantity).toBe(false);
    expect(INVENTORY_DOMAIN_DECISION.syncStrategy).toBe("ADR-049");
    expect(STOCK_ADJUSTED_EVENT).toBe("StockAdjusted");
    expect(INVENTORY_DOMAIN.primaryAdjustmentEvent).toBe("StockAdjusted");
    expect(INVENTORY_CACHE.ttlSeconds).toBe(300);
  });
});
