const CACHE_NAME = 'scooter-tracker-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Always bypass cache for external API calls, GAS calls, and assets to get fresh code
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('script.google.com') ||
    event.request.url.includes('allorigins') ||
    event.request.url.includes('assets')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
