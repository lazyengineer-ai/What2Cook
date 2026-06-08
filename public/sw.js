const CACHE_NAME = "what2cook-v2";
const OFFLINE_URLS = ["/home", "/plan"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/auth/")
  ) {
    return;
  }

  const isOfflinePage = OFFLINE_URLS.some(
    (path) => url.pathname === path || url.pathname.startsWith(`${path}/`)
  );
  if (!isOfflinePage) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
