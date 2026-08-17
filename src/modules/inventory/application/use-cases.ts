import { randomUUID } from "node:crypto";

import {
  assertOfflineRejectAndReview,
  assertPickupDecrementOnPaid,
  assertSaleDecrementInSameTx,
  assertStoreScopedSync,
  OFFLINE_STOCK_SYNC,
} from "./sync/index.js";
import {
  buildThresholdEvents,
  inventoryChangedEvent,
  stockAdjustedEvent,
  type InventoryChangeReason,
} from "../domain/events.js";
import type {
  InventorySyncIdempotencyPort,
  StockItemRepository,
} from "../domain/repositories.js";
import type { StockMovementRepository } from "../domain/stock-movement-repository.js";
import type { StockMovement } from "../domain/stock-movement.js";
import {
  applyStockDelta,
  createStockItemAggregate,
  type StockItem,
} from "../domain/stock-item.js";
import { InventoryDomainError } from "./errors.js";

export type InventoryUseCaseDeps = {
  stockItems: StockItemRepository;
  /** ADR-126 — append-only ledger; optional for legacy unit tests. */
  stockMovements?: StockMovementRepository;
  syncIdempotency?: InventorySyncIdempotencyPort;
  now?: () => Date;
  idFactory?: () => string;
};

export type AdjustStockInput = {
  merchantId: string;
  storeId: string;
  productId: string;
  /** Signed delta; result must stay >= 0 (MVP). */
  delta: number;
  reason?: string;
  /** When absent, create stock row at 0 then apply delta if non-negative result. */
  createIfMissing?: boolean;
  referenceType?: string;
  referenceId?: string;
  source?: string;
};

export type AdjustStockResult = {
  stockItem: StockItem;
  event: ReturnType<typeof stockAdjustedEvent>;
  syncEvents: Array<
    | ReturnType<typeof inventoryChangedEvent>
    | ReturnType<typeof buildThresholdEvents>[number]
  >;
};

export type DecrementForSaleInput = {
  merchantId: string;
  storeId: string;
  productId: string;
  quantity: number;
  /** Must be true — CompleteSale same-TX gate (ADR-049). */
  sameTransaction: boolean;
  /** ADR-126 — link movement to sale. */
  saleId?: string;
};

export type DecrementForPickupPaidInput = {
  merchantId: string;
  storeId: string;
  productId: string;
  quantity: number;
  /** Order status at apply time — must be `paid`. */
  orderStatus: string;
  /** Idempotent key e.g. `pickup:{orderId}:{productId}`. */
  syncKey: string;
  orderId?: string;
};

export type RestorePickupStockInput = {
  merchantId: string;
  storeId: string;
  productId: string;
  quantity: number;
  /** Idempotent key e.g. `pickup-restore:{orderId}:{productId}`. */
  syncKey: string;
  orderId?: string;
};

export type RejectOfflineStockConflictInput = {
  /** Always reject_and_review per ADR-091 — validated. */
  conflictPolicy?: string;
};

export type StockSyncResult = {
  stockItem: StockItem;
  alreadyApplied: boolean;
  inventoryChanged: ReturnType<typeof inventoryChangedEvent> | null;
  thresholdEvents: ReturnType<typeof buildThresholdEvents>;
};

function assertScope(merchantId: string, storeId: string, productId: string) {
  if (!merchantId || !storeId || !productId) {
    throw new InventoryDomainError("INVALID_STORE_SCOPE");
  }
  assertStoreScopedSync("store");
}

export function createInventoryUseCases(deps: InventoryUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  async function requireIdempotency(): Promise<InventorySyncIdempotencyPort> {
    if (!deps.syncIdempotency) {
      throw new Error(
        "syncIdempotency port required for pickup stock sync (ADR-049).",
      );
    }
    return deps.syncIdempotency;
  }

  async function alreadyAppliedResult(
    sync: InventorySyncIdempotencyPort,
    syncKey: string,
    merchantId: string,
    storeId: string,
    productId: string,
  ): Promise<StockSyncResult | null> {
    if (!(await sync.hasApplied(syncKey))) {
      return null;
    }
    const existing = await deps.stockItems.findByStoreProduct(
      merchantId,
      storeId,
      productId,
    );
    if (!existing) {
      throw new InventoryDomainError("STOCK_ITEM_NOT_FOUND");
    }
    return {
      stockItem: existing,
      alreadyApplied: true,
      inventoryChanged: null,
      thresholdEvents: [],
    };
  }

  async function applyQuantityDelta(input: {
    merchantId: string;
    storeId: string;
    productId: string;
    delta: number;
    changeReason: InventoryChangeReason;
    createIfMissing: boolean;
    adjustReason?: string;
    referenceType?: string | null;
    referenceId?: string | null;
    source?: string;
  }): Promise<{
    stockItem: StockItem;
    stockAdjusted: ReturnType<typeof stockAdjustedEvent> | null;
    inventoryChanged: ReturnType<typeof inventoryChangedEvent>;
    thresholdEvents: ReturnType<typeof buildThresholdEvents>;
  }> {
    assertScope(input.merchantId, input.storeId, input.productId);

    if (!Number.isInteger(input.delta) || input.delta === 0) {
      throw new InventoryDomainError("INVALID_QUANTITY_DELTA");
    }

    let item = await deps.stockItems.findByStoreProduct(
      input.merchantId,
      input.storeId,
      input.productId,
    );

    const at = now();

    if (!item) {
      if (!input.createIfMissing) {
        throw new InventoryDomainError("STOCK_ITEM_NOT_FOUND");
      }
      item = createStockItemAggregate({
        id: idFactory(),
        merchantId: input.merchantId,
        storeId: input.storeId,
        productId: input.productId,
        quantity: 0,
        now: at,
      });
      await deps.stockItems.save(item);
    }

    const projected = item.quantity + input.delta;
    if (projected < 0) {
      throw new InventoryDomainError("INSUFFICIENT_STOCK");
    }

    const expectedVersion = item.version;
    const { previousQuantity, nextQuantity } = applyStockDelta(
      item,
      input.delta,
      at,
    );

    const ok = await deps.stockItems.updateWithOptimisticLock(
      item,
      expectedVersion,
    );
    if (!ok) {
      throw new InventoryDomainError("VERSION_CONFLICT");
    }

    if (deps.stockMovements) {
      const { createStockMovement } = await import(
        "../domain/stock-movement.js"
      );
      const reason =
        input.changeReason === "sale"
          ? ("sale" as const)
          : input.changeReason === "pickup_paid"
            ? ("pickup_paid" as const)
            : input.changeReason === "pickup_restore"
              ? ("pickup_restore" as const)
              : ("adjustment" as const);
      await deps.stockMovements.append(
        createStockMovement({
          id: idFactory(),
          merchantId: item.merchantId,
          storeId: item.storeId,
          productId: item.productId,
          stockItemId: item.id,
          quantityDelta: input.delta,
          unitCode: "piece",
          reason,
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
          source: input.source ?? "system",
          ...(input.adjustReason !== undefined
            ? { note: input.adjustReason }
            : {}),
          now: at,
        }),
      );
    }

    const inventoryChanged = inventoryChangedEvent({
      stockItemId: item.id,
      merchantId: item.merchantId,
      storeId: item.storeId,
      productId: item.productId,
      delta: input.delta,
      quantityAfter: nextQuantity,
      reason: input.changeReason,
      occurredAt: at,
    });

    const thresholdEvents = buildThresholdEvents({
      stockItemId: item.id,
      merchantId: item.merchantId,
      storeId: item.storeId,
      productId: item.productId,
      previousQuantity,
      nextQuantity,
      reorderLevel: item.reorderLevel,
      occurredAt: at,
    });

    const stockAdjusted =
      input.changeReason === "adjust"
        ? stockAdjustedEvent({
            stockItemId: item.id,
            merchantId: item.merchantId,
            storeId: item.storeId,
            productId: item.productId,
            previousQuantity,
            nextQuantity,
            delta: input.delta,
            unitCode: "piece",
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            ...(input.adjustReason !== undefined
              ? { reason: input.adjustReason }
              : {}),
            occurredAt: at,
          })
        : null;

    return {
      stockItem: item,
      stockAdjusted,
      inventoryChanged,
      thresholdEvents,
    };
  }

  async function adjustStock(
    input: AdjustStockInput,
  ): Promise<AdjustStockResult> {
    const result = await applyQuantityDelta({
      merchantId: input.merchantId.trim(),
      storeId: input.storeId.trim(),
      productId: input.productId.trim(),
      delta: input.delta,
      changeReason: "adjust",
      createIfMissing: input.createIfMissing !== false,
      ...(input.reason !== undefined ? { adjustReason: input.reason } : {}),
      referenceType: input.referenceType ?? "manual_adjust",
      referenceId: input.referenceId ?? null,
      source: input.source ?? "adjust_api",
    });

    if (!result.stockAdjusted) {
      throw new Error("StockAdjusted required for manual adjust");
    }

    return {
      stockItem: result.stockItem,
      event: result.stockAdjusted,
      syncEvents: [result.inventoryChanged, ...result.thresholdEvents],
    };
  }

  /**
   * CompleteSale path — decrement inside the sale TX (ADR-049).
   */
  async function decrementForSale(
    input: DecrementForSaleInput,
  ): Promise<StockSyncResult> {
    try {
      assertSaleDecrementInSameTx(input.sameTransaction);
    } catch {
      throw new InventoryDomainError("SALE_TX_REQUIRED");
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new InventoryDomainError("INVALID_QUANTITY_DELTA");
    }

    const result = await applyQuantityDelta({
      merchantId: input.merchantId.trim(),
      storeId: input.storeId.trim(),
      productId: input.productId.trim(),
      delta: -input.quantity,
      changeReason: "sale",
      createIfMissing: false,
      referenceType: input.saleId ? "sale" : null,
      referenceId: input.saleId ?? null,
      source: "pos",
    });

    return {
      stockItem: result.stockItem,
      alreadyApplied: false,
      inventoryChanged: result.inventoryChanged,
      thresholdEvents: result.thresholdEvents,
    };
  }

  /**
   * Pickup path — hard decrement on `paid`; idempotent via syncKey (ADR-049).
   * Callers must not invoke again on `preparing` for the same line.
   */
  async function decrementForPickupPaid(
    input: DecrementForPickupPaidInput,
  ): Promise<StockSyncResult> {
    try {
      assertPickupDecrementOnPaid(input.orderStatus);
    } catch {
      throw new InventoryDomainError("INVALID_QUANTITY_DELTA");
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new InventoryDomainError("INVALID_QUANTITY_DELTA");
    }

    const sync = await requireIdempotency();
    const merchantId = input.merchantId.trim();
    const storeId = input.storeId.trim();
    const productId = input.productId.trim();
    const syncKey = input.syncKey.trim();
    if (!syncKey) {
      throw new InventoryDomainError("INVALID_STORE_SCOPE");
    }

    const prior = await alreadyAppliedResult(
      sync,
      syncKey,
      merchantId,
      storeId,
      productId,
    );
    if (prior) return prior;

    const result = await applyQuantityDelta({
      merchantId,
      storeId,
      productId,
      delta: -input.quantity,
      changeReason: "pickup_paid",
      createIfMissing: false,
      adjustReason: syncKey,
      referenceType: input.orderId ? "order" : "pickup_sync",
      referenceId: input.orderId ?? syncKey,
      source: "pickup",
    });

    await sync.markApplied(syncKey);

    return {
      stockItem: result.stockItem,
      alreadyApplied: false,
      inventoryChanged: result.inventoryChanged,
      thresholdEvents: result.thresholdEvents,
    };
  }

  /**
   * Compensating restore on pickup cancelled/refunded (ADR-049).
   */
  async function restorePickupStock(
    input: RestorePickupStockInput,
  ): Promise<StockSyncResult> {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new InventoryDomainError("INVALID_QUANTITY_DELTA");
    }

    const sync = await requireIdempotency();
    const merchantId = input.merchantId.trim();
    const storeId = input.storeId.trim();
    const productId = input.productId.trim();
    const syncKey = input.syncKey.trim();
    if (!syncKey) {
      throw new InventoryDomainError("INVALID_STORE_SCOPE");
    }

    const prior = await alreadyAppliedResult(
      sync,
      syncKey,
      merchantId,
      storeId,
      productId,
    );
    if (prior) return prior;

    const result = await applyQuantityDelta({
      merchantId,
      storeId,
      productId,
      delta: input.quantity,
      changeReason: "pickup_restore",
      createIfMissing: false,
      adjustReason: syncKey,
      referenceType: input.orderId ? "order" : "pickup_sync",
      referenceId: input.orderId ?? syncKey,
      source: "pickup",
    });

    await sync.markApplied(syncKey);

    return {
      stockItem: result.stockItem,
      alreadyApplied: false,
      inventoryChanged: result.inventoryChanged,
      thresholdEvents: result.thresholdEvents,
    };
  }

  /**
   * Offline sync conflict gate — stock shortage → reject-and-review (ADR-091).
   */
  function rejectOfflineStockConflict(
    input: RejectOfflineStockConflictInput = {},
  ): never {
    const policy =
      input.conflictPolicy ?? OFFLINE_STOCK_SYNC.stockShortageConflict;
    assertOfflineRejectAndReview(policy);
    throw new InventoryDomainError("OFFLINE_STOCK_REJECTED");
  }

  async function listStockMovements(input: {
    merchantId: string;
    storeId: string;
    productId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    movements: StockMovement[];
    nextCursor: string | null;
  }> {
    const merchantId = input.merchantId.trim();
    const storeId = input.storeId.trim();
    if (!deps.stockMovements) {
      return { movements: [], nextCursor: null };
    }
    const productId = input.productId?.trim();
    const cursor = input.cursor?.trim();
    return deps.stockMovements.listMovements({
      merchantId,
      storeId,
      ...(productId ? { productId } : {}),
      ...(cursor ? { cursor } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });
  }

  return {
    adjustStock,
    decrementForSale,
    decrementForPickupPaid,
    restorePickupStock,
    rejectOfflineStockConflict,
    listStockMovements,
  };
}

export type InventoryUseCases = ReturnType<typeof createInventoryUseCases>;

