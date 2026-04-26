// @ts-nocheck
// Minimal pass-through service worker.
// Intentionally does NOT precache, NOT runtime-cache, and NOT intercept fetches.
// This unblocks users whose previous SW poisoned their cache, while keeping
// the PWA "installable" capability. Re-add caching strategies later when
// the app is stable and we have a tested cache-busting plan.

self.addEventListener("install", (event) => {
  // Activate this SW immediately, replacing any older one.
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Wipe every cache from previous SW generations.
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      // Take control of all open tabs without requiring a reload.
      await self.clients.claim()
    })()
  )
})

// No `fetch` listener on purpose — the browser handles all requests directly,
// so a buggy cache can never break navigation.

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "MoneyNote", {
      body: data.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: { url: data.url ?? "/dashboard" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url ?? "/dashboard")
  )
})
