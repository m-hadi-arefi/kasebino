/* eslint-env serviceworker */
/* MerchantOS staff POS service worker (ADR-024).
 * Audience: staff only. Never share with store customer PWA (ADR-023).
 */
const CACHE = "mos-staff-pos-v1";
const PRECACHE = ["/pos", "/staff/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => {
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
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

self.addEventListener("sync", (event) => {
  if (event.tag === "mos-staff-sale-queue") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "mos-staff-sale-queue-sync" });
        }
      }),
    );
  }
});
