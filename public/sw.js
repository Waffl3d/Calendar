self.addEventListener('install', (event) => {
  console.log('Service Worker installed.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
});

// Listen for push events (for future push notifications)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Reminder';
  const options = {
    body: data.body || 'You have a reminder!',
    icon: '/icon.png', // place an icon in public folder if you want
  };
  event.waitUnti
