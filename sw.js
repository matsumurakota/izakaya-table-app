self.addEventListener('install', function(e) {
  console.log('Service Worker installed');
});
self.addEventListener('fetch', function(e) {
  // You can implement caching here if needed
});
