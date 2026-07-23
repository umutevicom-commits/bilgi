const CACHE_NAME = 'bilgi-yarismasi-v6';
// Vite build "base" ayarı ('/') ile eşleşmeli, aksi halde GitHub Pages
// alt dizininde önbellek asla isabet etmez ve offline destek çalışmaz.
const BASE = '/';
const STATIC_ASSETS = [BASE, `${BASE}index.html`, `${BASE}manifest.json`, `${BASE}favicon.svg`];

// Zayıf/anlık kopan bağlantılarda (mobil ağ vb.) tek seferlik fetch
// başarısızlığı tüm sayfayı kilitlemesin diye küçük bir retry.
async function fetchWithRetry(request, retries = 2, delayMs = 400) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(request);
      if (res && res.ok) return res;
      lastErr = new Error(`HTTP ${res && res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation: never serve stale broken HTML.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithRetry(request, 1, 300)
        .catch(() => fetch(request))
        .catch(() => caches.match(request).then((r) => r || caches.match(`${BASE}index.html`)))
    );
    return;
  }

  // Cache-first for static assets (dosya adları content-hash'li olduğu için
  // cache'e girdikten sonra güvenle sonsuza kadar kullanılabilir).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      // Cache'de yoksa (özellikle bir redeploy sonrası yeni hash'li dosyalar
      // için kaçınılmaz) mutlaka network'ten indirmemiz gerekiyor - burada
      // asla "undefined" gibi geçersiz bir yanıt döndürmüyoruz, çünkü bu
      // tarayıcının modülü hiç yükleyememesine ve sayfanın hiç render
      // olmamasına (siyah/boş ekran) yol açıyordu.
      return fetchWithRetry(request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
