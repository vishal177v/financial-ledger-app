// ─────────────────────────────────────────────────────────────────────────────
// SELF-DESTRUCTING SERVICE WORKER
// The app has been converted to a live-web app rather than offline-first PWA
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests
});
