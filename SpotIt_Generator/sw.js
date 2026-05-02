// SpotIt Generator — Service Worker v1.2
// Cacht die App für Offline-Nutzung

const CACHE_NAME = 'spotit-v4';
const ASSETS = [
  './',
  './spotit_generator.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: alle Assets voraus-cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: alte Caches löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Cache-first für eigene Assets, Network-first für alles andere
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Nur GET-Requests behandeln
  if (event.request.method !== 'GET') return;

  // Nicht-same-origin Requests (z.B. CDNs) direkt durchlassen
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Cache hit → sofort liefern, im Hintergrund updaten
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached;
      }

      // Cache miss → Netzwerk versuchen, bei Fehler Offline-Fallback
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Offline-Fallback: Hauptseite aus Cache liefern
        return caches.match('./spotit_generator.html');
      });
    })
  );
});

