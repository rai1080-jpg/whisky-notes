// ビルド時に vite.config.ts のプラグインが下記2つのプレースホルダを埋めて dist/sw.js を生成する。
const VERSION = '__VERSION__';
const CACHE = `whisky-notes-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache: 'reload' で HTTP キャッシュを経由せず最新を取得する
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      // 画面遷移はハッシュルーティングなので常にアプリ本体(index.html)を返す
      if (request.mode === 'navigate') return caches.match('./index.html');
      return fetch(request);
    }),
  );
});
