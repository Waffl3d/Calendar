self.addEventListener('install', (event) => {
  console.log('Service Worker installed.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
  // Claim clients so the service worker takes control of the page immediately
  event.waitUntil(self.clients.claim());
});

// Listen for push events (for push notifications)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Reminder';
  const options = {
    body: data.body || 'You have a reminder!',
    icon: '/icon.png', // Ensure this icon exists in your public folder
    badge: '/icon.png', // Optional: small badge icon
  };

  // Use waitUntil to ensure the notification is shown
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
