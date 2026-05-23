/**
 * Service Worker — Caches the app shell for offline use.
 */
const CACHE_NAME = 'shelflife-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/styles.css',
  './js/config.js',
  './js/store.js',
  './js/scanner.js',
  './js/recipes.js',
  './js/shelflife-db.js',
  './js/analytics.js',
  './js/shopping.js',
  './js/mealplan.js',
  './js/achievements.js',
  './js/notifications.js',
  './js/bulk-ops.js',
  './js/search.js',
  './js/reports.js',
  './js/onboarding.js',
  './js/voice.js',
  './js/keyboard.js',
  './js/budget.js',
  './js/sustainability.js',
  './js/profiles.js',
  './js/calendar.js',
  './js/widgets.js',
  './js/nutrition.js',
  './js/batch-import.js',
  './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Cache-first for app shell, network-first for APIs
  const url = new URL(event.request.url);
  if (url.hostname === 'world.openfoodfacts.org' || url.hostname.includes('themealdb')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, responseClone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
