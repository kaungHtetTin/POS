const CACHE_VERSION = 'cashier-shell-v1';
const APP_SCOPE = new URL(self.registration.scope).pathname;
const APP_SHELL = APP_SCOPE;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.add(new Request(APP_SHELL, { cache: 'reload' })))
            .catch(() => undefined)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;

    if (request.mode === 'navigate' && url.pathname.startsWith(APP_SCOPE)) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(APP_SHELL, response.clone()));
                    return response;
                })
                .catch(() => caches.match(APP_SHELL))
        );
        return;
    }

    if (['script', 'style', 'font', 'image'].includes(request.destination)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const refreshed = fetch(request).then((response) => {
                    if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
                    return response;
                }).catch(() => cached);
                return cached || refreshed;
            })
        );
    }
});
