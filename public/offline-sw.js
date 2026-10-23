const CACHE_VERSION = "edut-offline-v8";
const CORE_STATIC_ASSETS = [
  "/manifest.json",
  "/edut-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Pre-cache only lightweight static assets. 
      for (const url of CORE_STATIC_ASSETS) {
        try {
          await cache.add(new Request(url, { credentials: "same-origin" }));
        } catch (err) {
          console.warn("[SW] Cache add warning for", url, err);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Let API calls go to network or be handled by Dexie / IndexedDB offline layer
  if (url.pathname.startsWith("/api/")) return;

  // 2. Full Page Navigation requests (hard refresh, URL enter): Network First with Cache Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, copy.clone());
              cache.put(url.pathname, copy);
            });
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match(url.pathname)) ||
            (await caches.match("/dashboard")) ||
            (await caches.match("/"))
          );
        })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, fonts, icons): Cache First, fallback to Network
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ico");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. Other GET requests: Stale-While-Revalidate strategy
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
