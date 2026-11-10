/* EasyHome service worker — same-origin app shell only.
 * The API and cross-origin media are deliberately never cached.
 */

const VERSION = "easyhome-v11";
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

// Local notification tap-through: forward the click target to the open clients.
self.addEventListener("notification", (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  const url =
    typeof data === "string"
      ? data
      : typeof data.url === "string"
        ? data.url
        : "/";
  try {
    notification.close();
  } catch {
    /* already closed */
  }
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "easyhome:notification-click", url });
        });
      })
      .catch(() => {}),
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApi(url) {
  return url.pathname === "/api" || url.pathname.startsWith("/api/");
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

  // Cross-origin traffic (fonts, media CDNs) is never cached.
  if (!isSameOrigin(url)) return;
  if (isApi(url)) return;

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

/* -------------------------------------------------------------------------- */
/* Push notifications & background sound                                      */
/* -------------------------------------------------------------------------- */

self.addEventListener("push", (event) => {
  let data = {
    title: "EasyHome Notification",
    body: "You have a new booking update or message.",
    url: "/",
  };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || "New update on EasyHome",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    sound: "default",
    data: { url: data.url || "/" },
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "EasyHome", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});

