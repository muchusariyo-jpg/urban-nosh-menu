/* =========================================================
   URBAN NOSH — service-worker.js
   Caches the app shell and data files so the menu keeps
   working after the first visit, even with no signal.
   Bump CACHE_NAME whenever you change these files so
   returning visitors get the update instead of the old cache.
   ========================================================= */

const CACHE_NAME = "urban-nosh-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./menu.json",
  "./restaurant.json",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for app shell/data, falling back to network;
// network-first for everything else (e.g. Google Fonts) so
// content stays fresh when online.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
            return networkResponse;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
