const CACHE_NAME = 'lexai-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/security.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/features/chat.js',
  '/js/features/analyze.js',
  '/js/features/compare.js',
  '/js/features/rights.js',
  '/js/features/templates.js',
  '/js/app.js'
];

// Install Event - Pre-cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache-First Strategy for static assets
self.addEventListener('fetch', event => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  // Don't intercept API calls or Firebase resources
  if (event.request.url.includes('/api/gemini') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(response => {
        // Cache new static resources dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
