/**
 * Browser IndexedDB offline sale queue (ADR-105 / ADR-024).
 * Staff POS only — never used by store customer PWA.
 * Client-safe: no node:crypto.
 */

import { csrfHeadersForBrowserFetch } from "../infrastructure/security/index.js";
import {
  POS_OFFLINE_IDB,
  POS_OFFLINE_SERVICE_WORKER,
  requireSyncKey,
} from "./client.js";

export type PosOfflineDraftStatus =
  | "queued"
  | "syncing"
  | "synced"
  | "rejected_for_review"
  | "failed";

export type PosOfflineRejectReason = "stock_shortage" | "sync_error";

export type BrowserOfflineSaleLine = {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPriceMinor: bigint;
};

export type BrowserOfflineSaleDraft = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  readonly phoneNational: string;
  readonly tenderType: "cash" | "card_terminal" | "mixed";
  readonly lines: readonly BrowserOfflineSaleLine[];
  readonly totalAmountMinor: bigint;
  readonly syncKey: string;
  readonly queuedAt: Date;
  status: PosOfflineDraftStatus;
  rejectReason: PosOfflineRejectReason | null;
  saleId: string | null;
  syncedAt: Date | null;
};

export type SerializedOfflineSaleLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: string;
};

export type SerializedOfflineSaleDraft = {
  id: string;
  merchantId: string;
  storeId: string;
  phoneNational: string;
  tenderType: "cash" | "card_terminal" | "mixed";
  lines: SerializedOfflineSaleLine[];
  totalAmountMinor: string;
  syncKey: string;
  queuedAt: string;
  status: PosOfflineDraftStatus;
  rejectReason: PosOfflineRejectReason | null;
  saleId: string | null;
  syncedAt: string | null;
  consentNoticeVersion?: string;
};

export type BrowserEnqueueInput = {
  merchantId: string;
  storeId: string;
  phoneNational: string;
  tenderType: "cash" | "card_terminal" | "mixed";
  lines: readonly BrowserOfflineSaleLine[];
  totalAmountMinor: bigint;
  syncKey: string;
  id?: string;
  queuedAt?: Date;
  consentNoticeVersion?: string;
};

function assertBrowser(): void {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is required for staff offline queue (ADR-105).");
  }
}

function serialize(draft: BrowserOfflineSaleDraft): SerializedOfflineSaleDraft {
  return {
    id: draft.id,
    merchantId: draft.merchantId,
    storeId: draft.storeId,
    phoneNational: draft.phoneNational,
    tenderType: draft.tenderType,
    lines: draft.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor.toString(),
    })),
    totalAmountMinor: draft.totalAmountMinor.toString(),
    syncKey: draft.syncKey,
    queuedAt: draft.queuedAt.toISOString(),
    status: draft.status,
    rejectReason: draft.rejectReason,
    saleId: draft.saleId,
    syncedAt: draft.syncedAt ? draft.syncedAt.toISOString() : null,
  };
}

function deserialize(row: SerializedOfflineSaleDraft): BrowserOfflineSaleDraft {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    phoneNational: row.phoneNational,
    tenderType: row.tenderType,
    lines: row.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPriceMinor: BigInt(line.unitPriceMinor),
    })),
    totalAmountMinor: BigInt(row.totalAmountMinor),
    syncKey: row.syncKey,
    queuedAt: new Date(row.queuedAt),
    status: row.status,
    rejectReason: row.rejectReason,
    saleId: row.saleId,
    syncedAt: row.syncedAt ? new Date(row.syncedAt) : null,
  };
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb_error"));
  });
}

export async function openStaffPosIdb(): Promise<IDBDatabase> {
  assertBrowser();
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(POS_OFFLINE_IDB.dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(POS_OFFLINE_IDB.storeName)) {
        const store = db.createObjectStore(POS_OFFLINE_IDB.storeName, {
          keyPath: "id",
        });
        store.createIndex("by_status", "status", { unique: false });
        store.createIndex("by_sync_key", "syncKey", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb_open_failed"));
  });
}

type OfflineSaleQueueStore = {
  enqueue(draft: BrowserOfflineSaleDraft): Promise<void>;
  findBySyncKey(
    merchantId: string,
    syncKey: string,
  ): Promise<BrowserOfflineSaleDraft | null>;
  listByStatus(
    status: PosOfflineDraftStatus,
  ): Promise<readonly BrowserOfflineSaleDraft[]>;
  update(draft: BrowserOfflineSaleDraft): Promise<void>;
  depth(): Promise<number>;
};

export function createIdbOfflineSaleQueueStore(
  db: IDBDatabase,
): OfflineSaleQueueStore {
  const storeName = POS_OFFLINE_IDB.storeName;

  return {
    async enqueue(draft) {
      const existing = await this.findBySyncKey(draft.merchantId, draft.syncKey);
      if (existing) return;
      const tx = db.transaction(storeName, "readwrite");
      await idbReq(tx.objectStore(storeName).put(serialize(draft)));
    },
    async findBySyncKey(merchantId, syncKey) {
      const tx = db.transaction(storeName, "readonly");
      const all = (await idbReq(
        tx.objectStore(storeName).getAll(),
      )) as SerializedOfflineSaleDraft[];
      const hit = all.find(
        (d) => d.merchantId === merchantId && d.syncKey === syncKey,
      );
      return hit ? deserialize(hit) : null;
    },
    async listByStatus(status) {
      const tx = db.transaction(storeName, "readonly");
      const all = (await idbReq(
        tx.objectStore(storeName).getAll(),
      )) as SerializedOfflineSaleDraft[];
      return all.filter((d) => d.status === status).map(deserialize);
    },
    async update(draft) {
      const tx = db.transaction(storeName, "readwrite");
      await idbReq(tx.objectStore(storeName).put(serialize(draft)));
    },
    async depth() {
      const queued = await this.listByStatus("queued");
      const syncing = await this.listByStatus("syncing");
      return queued.length + syncing.length;
    },
  };
}

export async function enqueueOfflineSaleInIdb(
  input: BrowserEnqueueInput,
): Promise<BrowserOfflineSaleDraft> {
  const syncKey = requireSyncKey(input.syncKey);
  const db = await openStaffPosIdb();
  const store = createIdbOfflineSaleQueueStore(db);
  const existing = await store.findBySyncKey(input.merchantId, syncKey);
  if (existing) return existing;

  if (input.lines.length === 0) {
    throw new Error("Offline sale draft requires at least one line (ADR-105).");
  }

  const draft: BrowserOfflineSaleDraft = {
    id: input.id ?? crypto.randomUUID(),
    merchantId: input.merchantId,
    storeId: input.storeId,
    phoneNational: input.phoneNational,
    tenderType: input.tenderType,
    lines: input.lines.map((line) => ({ ...line })),
    totalAmountMinor: input.totalAmountMinor,
    syncKey,
    queuedAt: input.queuedAt ?? new Date(),
    status: "queued",
    rejectReason: null,
    saleId: null,
    syncedAt: null,
  };
  await store.enqueue(draft);

  if (input.consentNoticeVersion) {
    const tx = db.transaction(POS_OFFLINE_IDB.storeName, "readwrite");
    const row = serialize(draft);
    row.consentNoticeVersion = input.consentNoticeVersion;
    await idbReq(tx.objectStore(POS_OFFLINE_IDB.storeName).put(row));
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const syncManager = (
      reg as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;
    if (syncManager?.register) {
      await syncManager.register(POS_OFFLINE_SERVICE_WORKER.backgroundSyncTag);
    } else {
      reg.active?.postMessage({ type: "mos-staff-flush-now" });
    }
  } catch {
    /* Background Sync optional on Iranian WebViews */
  }

  return draft;
}

export type PosApiFlushItemResult = {
  syncKey: string;
  status: "synced" | "rejected_for_review" | "failed";
  saleId?: string;
  code?: string;
};

export type PosApiFlushResult = {
  synced: number;
  rejectedForReview: number;
  failed: number;
  events: readonly {
    eventType: "SaleCompleted";
    saleId: string;
    syncKey: string;
  }[];
  items: PosApiFlushItemResult[];
  rejectedDrafts: BrowserOfflineSaleDraft[];
};

/**
 * Flush queued drafts via POS CompleteSale API (credentialed cookies + CSRF).
 * Stock shortage → rejected_for_review (never silent overwrite).
 */
export async function flushOfflineSalesViaPosApi(
  options?: { consentNoticeVersion?: string },
): Promise<PosApiFlushResult> {
  const db = await openStaffPosIdb();
  const store = createIdbOfflineSaleQueueStore(db);
  const pending = await store.listByStatus("queued");
  let synced = 0;
  let rejectedForReview = 0;
  let failed = 0;
  const events: PosApiFlushResult["events"][number][] = [];
  const items: PosApiFlushItemResult[] = [];
  const rejectedDrafts: BrowserOfflineSaleDraft[] = [];

  for (const draft of pending) {
    const syncing: BrowserOfflineSaleDraft = {
      ...draft,
      lines: [...draft.lines],
      status: "syncing",
      rejectReason: null,
    };
    await store.update(syncing);

    try {
      const res = await fetch(POS_OFFLINE_SERVICE_WORKER.completeSalePath, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": draft.syncKey,
          ...csrfHeadersForBrowserFetch(),
        },
        body: JSON.stringify({
          storeId: draft.storeId,
          phone: draft.phoneNational,
          tenderType: draft.tenderType,
          consentNoticeVersion: options?.consentNoticeVersion ?? "pos-v1",
          lines: draft.lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceMinor: Number(line.unitPriceMinor),
          })),
        }),
      });
      const body = (await res.json()) as {
        data?: { sale?: { id: string } };
        error?: { code?: string; message?: string };
      };

      if (res.ok && body.data?.sale) {
        await store.update({
          ...syncing,
          status: "synced",
          saleId: body.data.sale.id,
          syncedAt: new Date(),
          rejectReason: null,
        });
        synced += 1;
        events.push({
          eventType: "SaleCompleted",
          saleId: body.data.sale.id,
          syncKey: draft.syncKey,
        });
        items.push({
          syncKey: draft.syncKey,
          status: "synced",
          saleId: body.data.sale.id,
        });
        continue;
      }

      if (body.error?.code === "INSUFFICIENT_STOCK") {
        const rejected: BrowserOfflineSaleDraft = {
          ...syncing,
          status: "rejected_for_review",
          rejectReason: "stock_shortage",
        };
        await store.update(rejected);
        rejectedForReview += 1;
        rejectedDrafts.push(rejected);
        items.push({
          syncKey: draft.syncKey,
          status: "rejected_for_review",
          code: "INSUFFICIENT_STOCK",
        });
        continue;
      }

      await store.update({
        ...syncing,
        status: "failed",
        rejectReason: "sync_error",
      });
      failed += 1;
      items.push({
        syncKey: draft.syncKey,
        status: "failed",
        ...(body.error?.code ? { code: body.error.code } : {}),
      });
    } catch {
      await store.update({
        ...syncing,
        status: "failed",
        rejectReason: "sync_error",
      });
      failed += 1;
      items.push({ syncKey: draft.syncKey, status: "failed" });
    }
  }

  return { synced, rejectedForReview, failed, events, items, rejectedDrafts };
}

export async function listOfflineDraftsByStatus(
  status: PosOfflineDraftStatus,
): Promise<readonly BrowserOfflineSaleDraft[]> {
  const db = await openStaffPosIdb();
  return createIdbOfflineSaleQueueStore(db).listByStatus(status);
}

export async function offlineQueueDepth(): Promise<number> {
  const db = await openStaffPosIdb();
  return createIdbOfflineSaleQueueStore(db).depth();
}

export async function listRejectedOfflineSales(): Promise<
  readonly BrowserOfflineSaleDraft[]
> {
  return listOfflineDraftsByStatus("rejected_for_review");
}

/** Pure helper for tests — maps API error → queue status. */
export function mapPosSyncErrorToDraftStatus(
  code: string | undefined,
): PosOfflineDraftStatus {
  if (code === "INSUFFICIENT_STOCK") return "rejected_for_review";
  return "failed";
}
