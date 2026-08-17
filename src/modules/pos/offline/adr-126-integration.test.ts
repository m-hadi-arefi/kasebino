/**
 * Offline POS sync identity readiness (ADR-024 / ADR-126).
 */

import { describe, expect, it } from "vitest";

import {
  createInMemoryOfflineSaleQueue,
  POS_OFFLINE_DRAFT_STATUSES,
  requireSyncKey,
} from "./index.js";

describe("ADR-126 offline POS integration readiness", () => {
  it("requires syncKey as deterministic idempotency identity", () => {
    expect(() => requireSyncKey("")).toThrow();
    expect(requireSyncKey("term-1:seq-9")).toBe("term-1:seq-9");
  });

  it("dedupes enqueue by syncKey and supports synced / rejected statuses", async () => {
    const queue = createInMemoryOfflineSaleQueue();

    const draft = await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      totalAmountMinor: 1000n,
      syncKey: "offline-key-1",
      lines: [
        {
          productId: "p1",
          productName: "نان",
          quantity: 1,
          unitPriceMinor: 1000n,
        },
      ],
    });
    expect(draft.status).toBe("queued");

    const again = await queue.enqueue({
      merchantId: "m1",
      storeId: "s1",
      phoneNational: "09121234567",
      tenderType: "cash",
      totalAmountMinor: 1000n,
      syncKey: "offline-key-1",
      lines: [
        {
          productId: "p1",
          productName: "نان",
          quantity: 1,
          unitPriceMinor: 1000n,
        },
      ],
    });
    expect(again.id).toBe(draft.id);
    expect(POS_OFFLINE_DRAFT_STATUSES).toContain("synced");
    expect(POS_OFFLINE_DRAFT_STATUSES).toContain("rejected_for_review");
  });
});
