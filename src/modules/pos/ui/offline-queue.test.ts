import { describe, expect, it, beforeEach } from "vitest";
import { enqueueOfflineSale, getOfflineQueue, removeOfflineSale, updateOfflineSale } from "./offline-queue.js";

describe("ADR-155 Offline POS Queue Runtime", () => {
  beforeEach(() => {
    // mock localstorage
    const store: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {},
      key: () => null,
      length: 0,
    };
  });

  it("enqueues sales locally when offline", async () => {
    const sale = await enqueueOfflineSale({
      syncKey: "offline-key-1",
      storeId: "store-1",
      phone: "09123456789",
      tenderType: "cash",
      lines: [
        {
          productId: "prod-1",
          productName: "گوشت راسته",
          quantity: 2,
          unitPriceMinor: 5000000,
        },
      ],
    });

    expect(sale.syncKey).toBe("offline-key-1");
    expect(sale.status).toBe("queued");

    const queue = await getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0]?.phone).toBe("09123456789");
  });

  it("updates and removes sales in offline queue", async () => {
    await enqueueOfflineSale({
      syncKey: "offline-key-2",
      storeId: "store-1",
      phone: "09999999999",
      tenderType: "pos_terminal",
      lines: [
        {
          productId: "prod-2",
          productName: "شیر کم چرب",
          quantity: 1,
          unitPriceMinor: 450000,
        },
      ],
    });

    let queue = await getOfflineQueue();
    const item = queue.find((s) => s.syncKey === "offline-key-2");
    expect(item).toBeDefined();

    if (item) {
      await updateOfflineSale({
        ...item,
        status: "rejected_for_review",
        errorMessageFa: "موجودی انبار ناکافی است",
      });
    }

    queue = await getOfflineQueue();
    const updated = queue.find((s) => s.syncKey === "offline-key-2");
    expect(updated?.status).toBe("rejected_for_review");
    expect(updated?.errorMessageFa).toBe("موجودی انبار ناکافی است");

    await removeOfflineSale("offline-key-2");
    queue = await getOfflineQueue();
    expect(queue.find((s) => s.syncKey === "offline-key-2")).toBeUndefined();
  });
});
