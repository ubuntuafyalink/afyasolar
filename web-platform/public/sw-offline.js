/*
 * AfyaSolar offline service worker (frontend-only).
 *
 * Caches the app shell + static assets so the facility dashboard keeps working
 * on low-connectivity / offline rural connections. Strategy:
 *   - /api/*          → network only (never cache dynamic API data)
 *   - navigations     → network-first, fall back to cache, then offline.html
 *   - other GETs      → stale-while-revalidate
 *
 * Push handling is preserved by importing the existing sw-push.js, so this SW
 * does not regress notifications.
 */
const CACHE = "afya-offline-v1"
const PRECACHE = ["/offline.html", "/manifest.json", "/images/services/logo.png"]

// Preserve existing push-notification handlers.
try {
  importScripts("/sw-push.js")
} catch (e) {
  // sw-push.js is optional; ignore if missing.
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  let url
  try {
    url = new URL(req.url)
  } catch (e) {
    return
  }
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return // network only

  // Navigations: network-first with cache + offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/offline.html"))),
    )
    return
  }

  // Static assets and other GETs: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
