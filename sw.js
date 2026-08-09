/* ClimateGuard Web — Service Worker (network-first)
   Objetivo: los testers reciben SIEMPRE la ultima version del sitio sin tener
   que forzar recarga. Solo intercepta peticiones GET del MISMO origen (el
   propio sitio); las llamadas al servidor (Apps Script), Google, mapas y CDNs
   pasan sin tocarse. Offline: sirve la copia cacheada. */
const CACHE = 'cg-web-v1.6.1';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== location.origin) return;           // deja pasar API/CDN/proxy/mapas
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });   // RED PRIMERO
      try { const c = await caches.open(CACHE); c.put(req, fresh.clone()); } catch (_) {}
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = (await caches.match('./index.html')) || (await caches.match('./'));
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
