const CACHE_NAME = 'moviebox-rosi-v1';
const STATIC_ASSETS = [
  './index.html',
  './offline.html',
  './css/style.css',
  './css/components.css',
  './css/player.css',
  './js/api.js',
  './js/cache.js',
  './js/router.js',
  './js/state.js',
  './js/utils.js',
  './js/components/card.js',
  './js/components/section.js',
  './js/components/hero.js',
  './js/components/bottomnav.js',
  './js/components/episodelist.js',
  './js/components/playercontrols.js',
  './js/pages/home.js',
  './js/pages/trending.js',
  './js/pages/search.js',
  './js/pages/section.js',
  './js/pages/downloads.js',
  './js/pages/detail.js',
  './js/pages/player.js',
  './js/downloads.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS.filter(url => !url.includes('icon'))))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Static assets: cache first, then network
// - API calls: network first, offline fallback
// - Images: cache first
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // API calls — network first
  if (url.hostname.includes('sansekai') || url.hostname.includes('aoneroom')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('./offline.html'))
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('./offline.html');
      });
    })
  );
});
