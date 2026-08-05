/* eslint-env serviceworker */
/* MerchantOS store customer PWA service worker (ADR-023 / ADR-105).
 * Audience: store-customer only. Never share with staff POS SW (ADR-022).
 * Online-first thin SW — no auth secrets in cache or IDB.
 */
const CACHE = "mos-store-customer-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  /* Never cache API or auth traffic. */
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/auth/")) {
    return;
  }
  /* Online-first: network, then optional cache shell. */
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.mode === "navigate") {
          const copy = res.clone();
          void caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || Response.error())),
  );
});
