// A simple Service Worker to enable PWA installability.
// It must listen for the 'fetch' event.

// NOTE: We're not doing any caching yet, but this listener must exist.
self.addEventListener('fetch', (event) => {
    // You can uncomment the line below later to enable offline caching
    // event.respondWith(fetch(event.request)); 
});


// Add a 'push' listener now to prepare for your push notifications
self.addEventListener('push', (event) => {
    const title = 'Tapla Notification';
    const options = {
        body: event.data ? event.data.text() : 'You have a new update!',
        icon: '/images/icon.png', // Use your manifest icon
    };
    
    // This is the core logic to display the notification
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// A basic 'install' listener is good practice
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});