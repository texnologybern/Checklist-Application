const CACHE = 'paros-checklist-v4'; // νέα έκδοση
const APP_SHELL = [
  './',
  './index.php',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE).map(k => caches.delete(k)))) );
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network-first για το bootstrap (GET μόνο)
  if (url.pathname.endsWith('/api.php') && url.searchParams.get('action') === 'bootstrap' && e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first για static
  if (APP_SHELL.some(p => url.pathname.endsWith(p.replace('./','/')))) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
    return;
  }
  // default: passthrough
});
