// public/sw.js
// Service worker — PWA install + cache shell.
// v2 (2026-05-05): network-first em tudo (HTML + assets) pra evitar bundle antigo
// permanente em cache. Cache fica como fallback offline.
//
// CACHE_NAME é reescrito automaticamente no build pelo plugin `sw-versioning`
// (ver vite.config.ts) injetando o commit SHA curto. Em dev (sem build) usa
// 'rdwth-shell-dev'. NÃO editar manualmente o valor abaixo — será sobrescrito.
const CACHE_NAME = 'rdwth-shell-dev';
const SHELL_URLS = ['/', '/index.html', '/icon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {})
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
  const req = event.request;
  // Só GET. Resto passa direto.
  if (req.method !== 'GET') return;

  // Skip Supabase/PostHog requests (sempre online, sem cache)
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.hostname.includes('supabase.co') || url.hostname.includes('posthog.com')) return;

  // Network-first em TUDO (HTML + assets). Cache fica como fallback offline.
  // Garante que bundle novo sempre é servido quando há conexão.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cacheia respostas válidas pra fallback offline futuro
        if (res && res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/') || new Response('', { status: 503 }))
      )
  );
});
