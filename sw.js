/* サプリ摂取トラッカー Service Worker
 * アプリシェルをキャッシュしてオフライン起動を可能にする。
 * 記録データは IndexedDB（SWの管轄外）に保存される。 */
const CACHE = 'suppl-tracker-v8';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts などクロスオリジンはランタイムキャッシュ（stale-while-revalidate）
  if (url.origin !== self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then(res => { if (res && res.status === 200) cache.put(req, res.clone()); return res; }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // 同一オリジン：キャッシュ優先、なければネット→キャッシュ追加。ナビゲーションは index.html にフォールバック
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});
