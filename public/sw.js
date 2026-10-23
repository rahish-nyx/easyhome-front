/* EasyHome service worker — same-origin app shell only.
 * Firebase Auth/Firestore/Storage and the API are deliberately never cached.
 */

const VERSION = "easyhome-v7";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const CURRENT_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);

const SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

/**
 * Store a clean copy of a response. Browsers expose the decoded body through
 * the Fetch API but keep the original Content-Encoding header; replaying that
 * pair from the Cache API makes stylesheets and scripts fail to parse offline.
 */
async function putClean(cache, request, response) {
  try {
    const headers = new Headers(response.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    // Static assets are origin-independent once cached; Vary can otherwise
    // make a cached stylesheet miss when the offline request omits Origin.
    headers.delete("vary");
    const body = await response.clone().arrayBuffer();
    await cache.put(
      request,
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
    );
  } catch {
    /* cache quota or opaque response — the network path still works */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(
        SHELL.map(async (url) => {
          const request = new Request(url, { cache: "reload" });
          const response = await fetch(request);
          if (response.ok) await putClean(cache, request, response);
        }),
      );
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("easyhome-") && !CURRENT_CACHES.has(key))
          .map((key) => caches.delete(key)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.disable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApi(url) {
  return url.pathname === "/api" || url.pathname.startsWith("/api/");
}

function isFirebaseInternal(url) {
  return url.pathname.startsWith("/__/");
}

function isAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    /\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf)$/i.test(url.pathname)
  );
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await putClean(cache, "/index.html", response);
      return response;
    }
  } catch {
    /* fall through to the offline shell */
  }

  const cached =
    (await caches.match(request, { ignoreSearch: true, ignoreVary: true })) ||
    (await caches.match("/index.html", { ignoreVary: true })) ||
    (await caches.match("/offline.html", { ignoreVary: true }));
  return (
    cached ||
    new Response(
      "<!doctype html><title>Offline · EasyHome</title><h1>You are offline</h1><p>Reconnect and try again.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    )
  );
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request, { ignoreVary: true });

  const update = fetch(event.request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        event.waitUntil(putClean(cache, event.request, response));
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(update);
    return cached;
  }

  const response = await update;
  if (response) return response;

  return (
    (await caches.match("/offline.html", { ignoreVary: true })) ||
    new Response("Offline", { status: 503, statusText: "Offline" })
  );
}

async function cacheFirst(event, cacheName) {
  const cached = await caches.match(event.request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(event.request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    event.waitUntil(putClean(cache, event.request, response));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || request.headers.has("range")) return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Cross-origin traffic (fonts, Firebase, media CDNs) is never cached.
  if (!isSameOrigin(url)) return;
  if (isApi(url) || isFirebaseInternal(url)) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isAsset(url)) {
    event.respondWith(cacheFirst(event, ASSET_CACHE));
    return;
  }

  if (
    url.pathname === "/manifest.json" ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/sitemap.xml"
  ) {
    event.respondWith(staleWhileRevalidate(event, ASSET_CACHE));
  }
});
