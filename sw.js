// sw.js - Service Worker for PWA (Offline Resilience)

const CACHE_NAME = 'matchpulse-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/js/app.js',
    '/js/config.js',
    '/js/control-room.js',
    '/js/data.js',
    '/js/fan-portal.js',
    '/js/stadium-engine.js',
    '/js/store.js',
    '/js/utils.js',
    '/js/view-manager.js',
    '/js/volunteer-portal.js',
    '/js/ai/groq-client.js',
    '/js/ai/stadium-graph.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') return;
    
    // Don't intercept API calls
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached response if found
                if (response) return response;
                
                // Otherwise fetch from network
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Don't cache if not a valid response
                        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clone and cache the response
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                );
            })
    );
});
