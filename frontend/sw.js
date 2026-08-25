/**
 * sw.js — Progressive Web App Service Worker for YatraMitra AI
 *
 * Implements offline caching, instant app shell loading, and resilient fallback
 * strategies for low-connectivity Indian heritage zones.
 */

const CACHE_NAME = "yatramitra-cache-v1";
const DATA_CACHE_NAME = "yatramitra-data-cache-v1";

// Static app shell resources to pre-cache on install
const PRECACHE_ASSETS = [
  "./",
  "index.html",
  "explore.html",
  "monument.html",
  "festivals.html",
  "laws.html",
  "alerts.html",
  "account.html",
  "css/base.css",
  "css/styles.css",
  "css/leaflet.css",
  "js/config.js",
  "js/api.js",
  "js/app.js",
  "js/leaflet.js",
  "js/home-assistant.js",
  "js/explore.js",
  "js/monument.js",
  "js/festivals.js",
  "js/laws.js",
  "js/alerts.js",
  "js/account.js",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// 1. Service Worker Installation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[ServiceWorker] Pre-caching offline app shell");
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[ServiceWorker] Non-critical pre-cache item skipped:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Service Worker Activation & Old Cache Cleanup
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
              console.log("[ServiceWorker] Purging deprecated cache:", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Interception & Caching Strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST / PUT / DELETE)
  if (request.method !== "GET") {
    return;
  }

  // Strategy A: API Requests (/api/*) — Network-First with Cache Fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return new Response(
              JSON.stringify({
                success: false,
                offline: true,
                message: "You are currently offline. Displaying cached data.",
              }),
              { headers: { "Content-Type": "application/json" } }
            );
          });
        })
    );
    return;
  }

  // Strategy B: Monument Images & External CDN Photos — Cache-First with Dynamic Cache
  if (
    url.pathname.includes("/images/") ||
    url.hostname.includes("wikimedia.org") ||
    url.hostname.includes("unsplash.com")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => {
            // Optional offline image fallback if necessary
            return caches.match("icons/icon.svg");
          });
      })
    );
    return;
  }

  // Strategy C: App Shell (HTML, CSS, JS, Fonts) — Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Return cached version immediately if present, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
