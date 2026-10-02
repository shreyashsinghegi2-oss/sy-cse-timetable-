// StudentXchange Service Worker - Safe CSS + Font Caching Only
// IMPORTANT: We do NOT cache HTML documents or JS bundles.
// Vite production builds use content-hashed filenames; caching old HTML
// would cause the old HTML to reference old (now-deleted) hashed JS → crashes.
// Only CSS and fonts are safe to cache (they are either content-hashed or CDN).
const CACHE_VERSION = 'studentxchange-v2026-07-14';
const CSS_CACHE = 'css-cache-v2026-07-14';

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap'
];

// Install — only pre-cache Google Fonts CSS (safe: external CDN, versioned)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CSS_CACHE)
      .then(cache => cache.addAll(FONT_URLS.map(u => new Request(u, { cache: 'no-cache' }))))
      .catch(() => {}) // non-fatal: fonts will be fetched fresh on demand
      .then(() => self.skipWaiting())
  );
});

// Activate — delete ALL old caches (version string changed → stale cache busted)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CSS_CACHE).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for CSS/fonts ONLY; everything else is always network-first
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only intercept CSS and font CDN requests
  const isCssOrFont = (
    event.request.destination === 'style' ||
    url.pathname.endsWith('.css') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  );

  if (!isCssOrFont) {
    // All other requests (HTML, JS, API, images) → always fetch from network
    // Do NOT call event.respondWith; let the browser handle it normally
    return;
  }

  // CSS/fonts: cache-first with network fallback
  event.respondWith(
    caches.open(CSS_CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => {
          // If font/CSS fails to fetch, return a minimal fallback for critical CSS
          if (url.pathname.includes('index.css')) {
            return new Response(
              'body{font-family:system-ui,sans-serif;margin:0;padding:0}',
              { headers: { 'Content-Type': 'text/css' } }
            );
          }
          throw new Error('CSS/font fetch failed');
        });
      })
    ).catch(() => fetch(event.request)) // safety net: fall back to network
  );
});

// Handle SKIP_WAITING message from main thread
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
