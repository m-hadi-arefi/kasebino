import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  POS_OFFLINE,
  POS_OFFLINE_APP_PATHS,
  POS_OFFLINE_COPY_FA,
  POS_OFFLINE_DECISION,
  POS_OFFLINE_IDB,
  POS_OFFLINE_INSTALL_UX,
  POS_OFFLINE_METRICS,
  POS_OFFLINE_SERVICE_WORKER,
  POS_OFFLINE_SYNC_API,
  POS_OFFLINE_UIUX_GATE,
  assertIdempotentSyncKeysRequired,
  assertOfflineQueueP1,
  assertOnlineFirstP0,
  assertPosOfflineUiuxGate,
  assertStaffOfflineAudience,
  bannerForConnectivity,
  createInMemoryOfflineSaleQueue,
  requireSyncKey,
  type OfflineCompleteSalePort,
  type OfflineStockPort,
  type PosOfflineSaleLineDraft,
} from "./index.js";

const sampleLine: PosOfflineSaleLineDraft = {
  productId: "prod-1",
  productName: "شیر",
  quantity: 2,
  unitPriceMinor: 50_000n,
};

describe("ADR-024 Offline-First Staff POS Strategy", () => {
  it("locks online P0, offline queue P1, reject-and-review, idempotent keys", () => {
    expect(POS_OFFLINE_DECISION.onlinePathPriority).toBe("P0");
    expect(POS_OFFLINE_DECISION.offlineQueuePriority).toBe("P1");
    expect(POS_OFFLINE_DECISION.stockShortageConflict).toBe(
      "reject_and_review",
    );
    expect(POS_OFFLINE_DECISION.idempotentSyncKeys).toBe(true);
    expect(POS_OFFLINE_DECISION.silentOverwriteForbidden).toBe(true);
    expect(POS_OFFLINE_DECISION.silentDoubleChargeForbidden).toBe(true);
    expect(POS_OFFLINE_DECISION.saleCompletedOnSync).toBe(true);
    expect(POS_OFFLINE_DECISION.primaryCompletionEvent).toBe("SaleCompleted");
    expect(POS_OFFLINE_DECISION.staffPwaOnly).toBe(true);
    expect(POS_OFFLINE_DECISION.storeCustomerPwaAdr).toBe("ADR-023");

    expect(() => assertOnlineFirstP0("P0")).not.toThrow();
    expect(() => assertOnlineFirstP0("P1")).toThrow(/P0/);
    expect(() => assertOfflineQueueP1("P1")).not.toThrow();
    expect(() => assertOfflineQueueP1("P0")).toThrow(/P1/);
    expect(() => assertIdempotentSyncKeysRequired(true)).not.toThrow();
    expect(() => assertIdempotentSyncKeysRequired(false)).toThrow(/Idempotent/);
  });

  it("documents sync API, staff SW/IDB, and sync metrics", () => {
    expect(POS_OFFLINE_SYNC_API.method).toBe("POST");
    expect(POS_OFFLINE_SYNC_API.path).toBe("/api/v1/sales/sync");
    expect(POS_OFFLINE_SYNC_API.syncKeyEqualsIdempotencyKey).toBe(true);
    expect(POS_OFFLINE_SYNC_API.successEvent).toBe("SaleCompleted");
    expect(POS_OFFLINE_SERVICE_WORKER.scriptUrl).toBe("/sw-staff.js");
    expect(POS_OFFLINE_SERVICE_WORKER.audience).toBe("staff");
    expect(POS_OFFLINE_SERVICE_WORKER.sharedWithStoreCustomerForbidden).toBe(
      true,
    );
    expect(POS_OFFLINE_IDB.draftModel).toBe("SaleDraft");
    expect(POS_OFFLINE_IDB.jwtPlaintextForbidden).toBe(true);
    expect(POS_OFFLINE_METRICS.syncFailure).toBe("pos_offline_sync_failure");
    expect(POS_OFFLINE_METRICS.warehouseEmitDeferred).toBe(true);
    expect(() => assertStaffOfflineAudience("staff")).not.toThrow();
    expect(() => assertStaffOfflineAudience("store-customer")).toThrow(
      /store-customer|ADR-023/i,
    );
  });

  it("ships Persian shop-floor messages and تومان note", () => {
    for (const msg of Object.values(POS_OFFLINE_COPY_FA)) {
      expect(msg).toMatch(/[\u0600-\u06FF]/);
    }
    expect(POS_OFFLINE_COPY_FA.stockRejected).toMatch(/موجودی|بررسی/);
    expect(POS_OFFLINE_COPY_FA.offlineQueued).toMatch(/آفلاین|صف/);
    expect(POS_OFFLINE_COPY_FA.tomanNote).toMatch(/تومان/);
    expect(POS_OFFLINE_INSTALL_UX.minTouchTargetPx).toBeGreaterThanOrEqual(44);
    expect(POS_OFFLINE_INSTALL_UX.dir).toBe("rtl");
    expect(bannerForConnectivity({ online: true, queuedCount: 0 })).toBe(
      POS_OFFLINE_COPY_FA.online,
    );
    expect(bannerForConnectivity({ online: false, queuedCount: 1 })).toBe(
      POS_OFFLINE_COPY_FA.offlineQueued,
    );
    expect(bannerForConnectivity({ online: false, queuedCount: 0 })).toBe(
      POS_OFFLINE_COPY_FA.offlineEmpty,
    );
  });

  it("requires syncKey and is idempotent on enqueue", async () => {
    const queue = createInMemoryOfflineSaleQueue();
    expect(() => requireSyncKey("")).toThrow(/syncKey/);
    expect(requireSyncKey("  key-1  ")).toBe("key-1");

    const a = await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      lines: [sampleLine],
      totalAmountMinor: 100_000n,
      syncKey: "sync-1",
    });
    const b = await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      lines: [sampleLine],
      totalAmountMinor: 100_000n,
      syncKey: "sync-1",
    });
    expect(b.id).toBe(a.id);
    expect(await queue.depth()).toBe(1);
  });

  it("flushes queue to SaleCompleted with idempotent sync keys", async () => {
    const queue = createInMemoryOfflineSaleQueue();
    await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      lines: [sampleLine],
      totalAmountMinor: 100_000n,
      syncKey: "sync-ok",
    });

    const completedKeys: string[] = [];
    const stock: OfflineStockPort = {
      async hasSufficientStock() {
        return true;
      },
    };
    const completeSale: OfflineCompleteSalePort = {
      async complete(input) {
        if (completedKeys.includes(input.idempotencyKey)) {
          return { saleId: "sale-dup", alreadyApplied: true };
        }
        completedKeys.push(input.idempotencyKey);
        return { saleId: "sale-1", alreadyApplied: false };
      },
    };

    const result = await queue.flush({ stock, completeSale });
    expect(result.synced).toBe(1);
    expect(result.rejectedForReview).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.events).toEqual([
      {
        eventType: "SaleCompleted",
        saleId: "sale-1",
        syncKey: "sync-ok",
      },
    ]);
    expect(completedKeys).toEqual(["sync-ok"]);
    expect(await queue.depth()).toBe(0);

    // Re-enqueue same key still idempotent at queue layer
    await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      lines: [sampleLine],
      totalAmountMinor: 100_000n,
      syncKey: "sync-ok",
    });
    expect(await queue.depth()).toBe(0);
  });

  it("rejects stock shortage for review (ADR-091) without completing sale", async () => {
    const queue = createInMemoryOfflineSaleQueue();
    await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      lines: [sampleLine],
      totalAmountMinor: 100_000n,
      syncKey: "sync-oos",
    });

    let completeCalls = 0;
    const result = await queue.flush({
      stock: {
        async hasSufficientStock() {
          return false;
        },
      },
      completeSale: {
        async complete() {
          completeCalls += 1;
          return { saleId: "should-not", alreadyApplied: false };
        },
      },
    });

    expect(result.rejectedForReview).toBe(1);
    expect(result.synced).toBe(0);
    expect(result.events).toEqual([]);
    expect(completeCalls).toBe(0);
    const rejected = await queue.listRejectedForReview();
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.rejectReason).toBe("stock_shortage");
    expect(rejected[0]?.status).toBe("rejected_for_review");
    expect(POS_OFFLINE_COPY_FA.stockRejected).toMatch(/[\u0600-\u06FF]/);
  });

  it("marks sync errors as failed without silent double charge", async () => {
    const queue = createInMemoryOfflineSaleQueue();
    await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      lines: [sampleLine],
      totalAmountMinor: 100_000n,
      syncKey: "sync-fail",
    });

    const result = await queue.flush({
      stock: {
        async hasSufficientStock() {
          return true;
        },
      },
      completeSale: {
        async complete() {
          throw new Error("network");
        },
      },
    });

    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);
    expect(result.events).toEqual([]);
  });

  it("passes uiuxpromax gate and scaffolds offline banner + staff SW", () => {
    expect(POS_OFFLINE_UIUX_GATE.gatePassed).toBe(true);
    expect(POS_OFFLINE_UIUX_GATE.brief.persian).toBe(true);
    expect(POS_OFFLINE_UIUX_GATE.brief.rtl).toBe(true);
    expect(() => assertPosOfflineUiuxGate()).not.toThrow();

    const root = process.cwd();
    for (const rel of [
      POS_OFFLINE_APP_PATHS.offlineStatus,
      POS_OFFLINE_APP_PATHS.posPage,
      POS_OFFLINE_APP_PATHS.serviceWorker,
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }

    const status = readFileSync(
      join(root, POS_OFFLINE_APP_PATHS.offlineStatus),
      "utf8",
    );
    const page = readFileSync(join(root, POS_OFFLINE_APP_PATHS.posPage), "utf8");
    const sw = readFileSync(
      join(root, POS_OFFLINE_APP_PATHS.serviceWorker),
      "utf8",
    );

    expect(status).toMatch(/POS_OFFLINE_COPY_FA|bannerForConnectivity/);
    expect(status).toMatch(/use client/);
    expect(status).toMatch(/reviewQueueCta|tomanNote|regionLabel/);
    expect(page).toMatch(/StaffOfflineStatus|offline-status/);
    expect(page).not.toMatch(/ADR-024\)\s*می‌آید/);
    expect(page).toMatch(/آفلاین|آنلاین/);
    expect(sw).toMatch(/sw-staff|staff|precache|\/pos/);
    expect(POS_OFFLINE.decision.adr).toBe("ADR-024");
  });
});
