/**
 * Wine Scanner — Service Worker
 *
 * Strategy:
 * - Navigation requests (HTML): network-first, fall back to cached shell
 * - Same-origin assets (JS, CSS, images): cache-first, update in background
 * - External requests (Gemini API, Tailwind CDN): always network, never cached
 *
 * Bump VERSION when deploying a new build so old caches are pruned.
 */

const VERSION   = 'v4'
const CACHE     = `wine-scanner-${VERSION}`
const SHELL_URL = '/'

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.add(SHELL_URL))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: prune caches from old versions ──────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept cross-origin requests (Gemini API, Tailwind CDN, etc.)
  if (url.origin !== self.location.origin) return

  // Navigation: network-first so users always get the freshest shell when online
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(SHELL_URL, clone))
          return response
        })
        .catch(() => caches.match(SHELL_URL))
    )
    return
  }

  // Same-origin assets: cache-first, populate cache on miss
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
        }
        return response
      })
    })
  )
})
