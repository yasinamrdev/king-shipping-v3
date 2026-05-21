const CACHE = 'king-shipping-v1';
const ASSETS = [
  '/index.html',
  '/user-login.html',
  '/user-register.html',
  '/user-panel.html',
  '/courier-login.html',
  '/courier.html',
  '/admin-login.html',
  '/admin.html',
  '/css/style.css',
  '/js/main.js',
  '/js/sound.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(res) {
        if (res.ok && e.request.method === 'GET' && e.request.url.startsWith(self.location.origin)) {
          var c = caches.open(CACHE);
          c.then(function(cache) { cache.put(e.request, res.clone()); });
        }
        return res;
      }).catch(function() {
        if (e.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});
