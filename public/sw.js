// خدمتي service worker. The server fills VERSION and PRECACHE from the deployed files, so any
// change to the app installs a new worker and the page offers a one-tap update.
const VERSION = '__VERSION__';
const PRECACHE = '__PRECACHE__';

const SHELL_CACHE = `khedmati-shell-${VERSION}`;
const DATA_CACHE = 'khedmati-data-v1';
const MAX_DATA_ENTRIES = 80;
const NAVIGATION_TIMEOUT_MS = 4000;

// Only public, cache-safe API reads are kept for offline use; personal data never is.
const OFFLINE_READABLE_API = [/^\/api\/meta$/, /^\/api\/jobs$/, /^\/api\/jobs\/\d+$/, /^\/api\/workers$/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('khedmati-shell-') && key !== SHELL_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
  if (event.data === 'clear-data') event.waitUntil(caches.delete(DATA_CACHE));
});

const offlineJson = () => new Response(JSON.stringify({ error: { code: 'OFFLINE' } }), {
  status: 503,
  headers: { 'Content-Type': 'application/json' },
});

const trimCache = async (cache, max) => {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
};

const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), ms);
  promise.then((value) => {
    clearTimeout(timer);
    resolve(value);
  }, (error) => {
    clearTimeout(timer);
    reject(error);
  });
});

// Pages: fresh from the network (the server adds link-preview tags), the cached shell when
// offline or when the network is too slow.
const handleNavigation = async (request) => {
  try {
    return await withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS);
  } catch {
    const cached = await caches.match('/', { cacheName: SHELL_CACHE });
    return cached ?? fetch(request);
  }
};

const handlePublicData = async (request) => {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_DATA_ENTRIES);
    }
    return response;
  } catch {
    return (await cache.match(request)) ?? offlineJson();
  }
};

const handleAsset = async (request) => {
  const cached = await caches.match(request, { cacheName: SHELL_CACHE });
  if (cached) return cached;
  return fetch(request);
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  } else if (url.pathname.startsWith('/api/')) {
    if (OFFLINE_READABLE_API.some((pattern) => pattern.test(url.pathname))) event.respondWith(handlePublicData(request));
  } else {
    event.respondWith(handleAsset(request));
  }
});
