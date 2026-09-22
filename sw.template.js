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

/** 画面表示(HTML)はネットワーク優先。オフラインのときだけキャッシュを使う */
async function handleNavigation(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put('./index.html', fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match('./index.html', { ignoreSearch: true });
    // オフラインかつ未キャッシュのときは、ブラウザ標準のエラー表示に任せる
    return cached ?? Response.error();
  }
}

/** ファイル名にハッシュが入る資産はキャッシュ優先。無ければ取得してキャッシュに足す */
async function handleAsset(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  /*
   * HTML をキャッシュ優先にすると、更新直後に「古い HTML が、すでに消えた
   * 古い JS を読みに行く」状態が起きて画面が真っ白になる。そのため分けている。
   */
  event.respondWith(request.mode === 'navigate' ? handleNavigation(request) : handleAsset(request));
});
