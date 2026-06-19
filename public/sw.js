const CACHE_NAME = 'rockstar-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/tiles/gold_record.svg',
  './assets/tiles/silver_record.svg',
  './assets/tiles/music_note.svg',
  './assets/tiles/star.svg',
  './assets/tiles/spotlight.svg',
  './assets/tiles/speaker.svg',
  './assets/tiles/microphone_blast.svg',
  './assets/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll, and fall back gracefully if some files are not yet generated
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[ServiceWorker] Caching warning during install:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle HTTP/S requests (skip chrome-extension, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Bypass service worker caching on localhost / 127.0.0.1 to prevent caching issues during development
  const isLocalhost = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
  if (isLocalhost) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache dynamic builds or assets on the fly if successful
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Gracefully handle navigation request fallback
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('/');
        }
      });
    })
  );
});
