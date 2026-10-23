const CACHE_VERSION = "edut-offline-v8";
const CORE_STATIC_ASSETS = [
  "/offline.html",
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
          const cached =
            (await caches.match(request)) ||
            (await caches.match(url.pathname)) ||
            (await caches.match("/dashboard")) ||
            (await caches.match("/")) ||
            (await caches.match("/offline.html"));

          if (cached) return cached;

          // Ultimate safety guarantee: never return undefined to prevent ERR_FAILED
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mode Hors-Ligne</title></head><body style="background:#08090e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Mode Hors-Ligne Actif</h2><p>Page en attente de reconnexion...</p><button onclick="window.history.back()" style="padding:10px 20px;border-radius:10px;background:#6366f1;color:#fff;border:none;cursor:pointer;">← Retour</button></div></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }
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
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        const pathnameCached = await caches.match(url.pathname);
        if (pathnameCached) return pathnameCached;

        return fetch(request)
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
            // Check other caches as fallback for chunks
            const keys = await caches.keys();
            for (const key of keys) {
              const c = await caches.open(key);
              const m = (await c.match(request)) || (await c.match(url.pathname));
              if (m) return m;
            }
            return new Response("", { status: 404, statusText: "Offline chunk missing" });
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
