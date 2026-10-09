const VERSION = 'v5.0.0';
const CACHE = 'microscope-' + VERSION;
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname.includes('generativelanguage') ||
      url.hostname.includes('jlcsearch') ||
      url.hostname.includes('google.com/generate_204')) return;

  if (url.hostname.includes('jsdelivr') ||
      url.hostname.includes('unpkg')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match(req);
      const fetchP = fetch(req).then(resp => {
        if (resp.ok) c.put(req, resp.clone());
        return resp;
      }).catch(() => cached);
      return cached || fetchP;
    }));
    return;
  }

  e.respondWith(caches.match(req).then(cached => {
    if (cached) return cached;
    return fetch(req).then(resp => {
      if (resp.ok && url.origin === location.origin) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      }
      return resp;
    }).catch(() => caches.match('./index.html'));
  }));
});