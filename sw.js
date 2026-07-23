/* =====================================================================
   FuelApp — Service Worker (PWA)
   Cache stratégie : Network-first pour l'API, Cache-first pour les assets
   ===================================================================== */

const CACHE_NAME = 'fuelapp-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'
];

// Installation : mise en cache des assets statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activation : purge des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : Network-first pour l'API data.gouv.fr, Cache-first pour le reste
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // API gouvernementale : toujours réseau, pas de cache
  if (url.includes('data.economie.gouv.fr') || url.includes('data.gouv.fr')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ results: [] }), { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Tuiles OpenStreetMap : Cache-first (offline maps)
  if (url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME + '-tiles').then(c => c.put(event.request, clone));
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Assets statiques : Cache-first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      })
    )
  );
});