/**
 * ADR-155 — Offline POS Queue & IndexedDB Storage Runtime.
 * Manages queued offline sales, local persistence, and background resynchronization.
 */

export type OfflineQueuedSale = {
  syncKey: string;
  merchantId?: string;
  storeId: string;
  phone: string;
  tenderType: string;
  lines: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPriceMinor: number | string;
  }>;
  consentNoticeVersion?: string;
  queuedAt: string;
  status: "queued" | "syncing" | "failed" | "rejected_for_review";
  errorMessageFa?: string;
  retryCount: number;
};

const DB_NAME = "merchantos_pos_offline_db";
const STORE_NAME = "sales_queue";
const DB_VERSION = 1;

function openOfflineDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "syncKey" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn("Failed to open offline IndexedDB:", request.error);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

let inMemoryStorageFallback: OfflineQueuedSale[] = [];

function getLocalStorageQueue(): OfflineQueuedSale[] {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    try {
      return JSON.parse(globalThis.localStorage.getItem("pos_offline_queue") || "[]");
    } catch {
      return inMemoryStorageFallback;
    }
  }
  return inMemoryStorageFallback;
}

function setLocalStorageQueue(queue: OfflineQueuedSale[]): void {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    try {
      globalThis.localStorage.setItem("pos_offline_queue", JSON.stringify(queue));
      return;
    } catch {
      // fallback below
    }
  }
  inMemoryStorageFallback = queue;
}

export async function enqueueOfflineSale(
  sale: Omit<OfflineQueuedSale, "queuedAt" | "status" | "retryCount">,
): Promise<OfflineQueuedSale> {
  const queuedSale: OfflineQueuedSale = {
    ...sale,
    queuedAt: new Date().toISOString(),
    status: "queued",
    retryCount: 0,
  };

  const db = await openOfflineDb();
  if (!db) {
    const list = getLocalStorageQueue();
    list.push(queuedSale);
    setLocalStorageQueue(list);
    return queuedSale;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(queuedSale);
      tx.oncomplete = () => resolve(queuedSale);
      tx.onerror = () => resolve(queuedSale);
    } catch {
      resolve(queuedSale);
    }
  });
}

export async function getOfflineQueue(): Promise<OfflineQueuedSale[]> {
  const db = await openOfflineDb();
  if (!db) {
    return getLocalStorageQueue();
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function removeOfflineSale(syncKey: string): Promise<void> {
  const db = await openOfflineDb();
  if (!db) {
    const list = getLocalStorageQueue();
    const filtered = list.filter((s) => s.syncKey !== syncKey);
    setLocalStorageQueue(filtered);
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(syncKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function updateOfflineSale(sale: OfflineQueuedSale): Promise<void> {
  const db = await openOfflineDb();
  if (!db) {
    const list = getLocalStorageQueue();
    const idx = list.findIndex((s) => s.syncKey === sale.syncKey);
    if (idx >= 0) {
      list[idx] = sale;
      setLocalStorageQueue(list);
    }
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(sale);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export type SyncResultSummary = {
  syncedCount: number;
  rejectedCount: number;
  failedCount: number;
};

/**
 * Replays all queued sales to the backend `/api/v1/pos/sales/sync` endpoint.
 */
export async function flushOfflineQueue(): Promise<SyncResultSummary> {
  const queue = await getOfflineQueue();
  const pending = queue.filter((s) => s.status === "queued" || s.status === "failed");
  if (pending.length === 0) {
    return { syncedCount: 0, rejectedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let rejectedCount = 0;
  let failedCount = 0;

  try {
    const res = await fetch("/api/v1/pos/sales/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        sales: pending.map((s) => ({
          storeId: s.storeId,
          phone: s.phone,
          tenderType: s.tenderType,
          syncKey: s.syncKey,
          lines: s.lines,
          consentNoticeVersion: s.consentNoticeVersion,
          merchantId: s.merchantId,
        })),
      }),
    });

    if (!res.ok) {
      return { syncedCount: 0, rejectedCount: 0, failedCount: pending.length };
    }

    const body = (await res.json()) as {
      data?: {
        results?: Array<{
          syncKey: string;
          status: "synced" | "rejected_for_review" | "failed";
          messageFa?: string;
        }>;
      };
    };

    const results = body.data?.results ?? [];
    for (const result of results) {
      if (result.status === "synced") {
        syncedCount++;
        await removeOfflineSale(result.syncKey);
      } else if (result.status === "rejected_for_review") {
        rejectedCount++;
        const item = pending.find((s) => s.syncKey === result.syncKey);
        if (item) {
          await updateOfflineSale({
            ...item,
            status: "rejected_for_review",
            errorMessageFa: result.messageFa || "موجودی کالا کافی نیست یا نیاز به بازبینی دارد.",
          });
        }
      } else {
        failedCount++;
        const item = pending.find((s) => s.syncKey === result.syncKey);
        if (item) {
          await updateOfflineSale({
            ...item,
            status: "failed",
            errorMessageFa: result.messageFa || "خطا در همگام‌سازی فروش",
            retryCount: item.retryCount + 1,
          });
        }
      }
    }
  } catch (error) {
    failedCount = pending.length;
  }

  return { syncedCount, rejectedCount, failedCount };
}
