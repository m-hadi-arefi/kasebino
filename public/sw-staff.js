/* eslint-env serviceworker */
/* MerchantOS staff POS service worker (ADR-024 / ADR-105).
 * Audience: staff only. Never share with store customer PWA (ADR-023).
 */
const CACHE = "mos-staff-pos-v2";
const PRECACHE = ["/pos", "/staff/manifest.webmanifest", "/icons/staff-pwa-default.svg"];
const SYNC_TAG = "mos-staff-sale-queue";
const IDB_NAME = "mos-staff-pos";
const IDB_STORE = "sale_drafts";
const POS_SALES_PATH = "/api/v1/pos/sales";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => {
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("mos-staff-pos-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).catch(() =>
          caches.match("/pos").then((fallback) => fallback || Response.error()),
        )
      );
    }),
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: "id" });
        store.createIndex("by_status", "status", { unique: false });
        store.createIndex("by_sync_key", "syncKey", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function listQueuedDrafts(db) {
  const tx = db.transaction(IDB_STORE, "readonly");
  const store = tx.objectStore(IDB_STORE);
  const all = await idbRequest(store.getAll());
  return (all || []).filter((d) => d && d.status === "queued");
}

async function putDraft(db, draft) {
  const tx = db.transaction(IDB_STORE, "readwrite");
  await idbRequest(tx.objectStore(IDB_STORE).put(draft));
}

async function flushQueuedSales() {
  const db = await openDb();
  const queued = await listQueuedDrafts(db);
  let synced = 0;
  let rejected = 0;
  let failed = 0;

  for (const draft of queued) {
    const syncing = { ...draft, status: "syncing", rejectReason: null };
    await putDraft(db, syncing);
    try {
      const headers = {
        "Content-Type": "application/json",
        "Idempotency-Key": draft.syncKey,
      };
      let csrf = null;
      if (self.cookieStore && typeof self.cookieStore.get === "function") {
        const c =
          (await self.cookieStore.get("mos.csrf")) ||
          (await self.cookieStore.get("__Host-mos.csrf"));
        csrf = c?.value ?? null;
      }
      if (csrf) headers["x-csrf-token"] = csrf;

      const res = await fetch(POS_SALES_PATH, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          storeId: draft.storeId,
          phone: draft.phoneNational,
          tenderType: draft.tenderType,
          consentNoticeVersion: draft.consentNoticeVersion || "pos-v1",
          lines: (draft.lines || []).map((line) => ({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
          })),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.data?.sale) {
        await putDraft(db, {
          ...syncing,
          status: "synced",
          saleId: body.data.sale.id,
          syncedAt: new Date().toISOString(),
          rejectReason: null,
        });
        synced += 1;
        continue;
      }

      const code = body?.error?.code;
      if (code === "INSUFFICIENT_STOCK") {
        await putDraft(db, {
          ...syncing,
          status: "rejected_for_review",
          rejectReason: "stock_shortage",
        });
        rejected += 1;
        continue;
      }

      await putDraft(db, {
        ...syncing,
        status: "failed",
        rejectReason: "sync_error",
      });
      failed += 1;
    } catch {
      await putDraft(db, {
        ...syncing,
        status: "failed",
        rejectReason: "sync_error",
      });
      failed += 1;
    }
  }

  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({
      type: "mos-staff-sale-queue-sync",
      result: { synced, rejected, failed },
    });
  }
  return { synced, rejected, failed };
}

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(
      flushQueuedSales().catch(() =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "mos-staff-sale-queue-sync" });
          }
        }),
      ),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "mos-staff-flush-now") {
    event.waitUntil(flushQueuedSales());
  }
});
