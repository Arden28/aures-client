// Define the cache name and the list of files for the App Shell (UI files)
const CACHE_NAME = 'tapla-static-v1';
const urlsToCache = [
  '/',                     // The root page (index.html)
  '/index.html',           // Explicitly cache index
//   '/index.css',             // main styles
//   '/main.js',              // main bundled script
  '/images/icon.png',      // Critical icon
  // Add other critical static assets here
];

self.addEventListener('install', (event) => {
    console.log('Service Worker installed, adding App Shell to cache.');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Cache the core app assets
                return cache.addAll(urlsToCache);
            })
    );
    // Force the new service worker to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated and claiming control.');
    // Remove old caches to save space and ensure fresh assets
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((cacheName) => {
                    return cacheName.startsWith('tapla-') && cacheName !== CACHE_NAME;
                }).map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            return self.clients.claim(); // Claim control immediately
        })
    );
});

// Cache-first strategy for reliable loading (App Shell model)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        // Try to find the resource in the cache first
        caches.match(event.request)
            .then((response) => {
                // Return cached resource if found
                if (response) {
                    return response;
                }
                // Otherwise, fetch from the network
                return fetch(event.request);
            })
    );
});

// Push notification listener (same as before, but with added click handler)
self.addEventListener('push', (event) => {
    // ... logic to parse payload and show notification ...
    // (Ensure this part is robust, as discussed previously)
});
// Add a listener to handle clicks on the notification (for 'real app' feel)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // Logic to open the app or a specific URL when the user clicks the notification
    const urlToOpen = event.notification.data ? event.notification.data.url : '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});