// Service Worker — Portal do Colaborador PWA
// Cache estratégico: App Shell offline + documentos online

const CACHE_VERSION = "v1.0.0";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Recursos que ficam em cache para funcionar offline (App Shell)
const APP_SHELL_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ── Install: faz cache do App Shell ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn("[SW] Falha ao cachear App Shell:", err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: remove caches antigos ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== APP_SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estratégia Network First para API, Cache First para assets ──
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignora requisições de outros domínios (Supabase, Google Fonts, etc.)
  if (url.origin !== location.origin) return;

  // API Routes: sempre vai para a rede (dados precisam ser frescos)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Sem conexão. Tente novamente quando online." }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Navegação (páginas HTML): Network First → cache → offline page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Atualiza o cache com a resposta mais recente
          const resClone = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) => cached || caches.match("/offline")
          )
        )
    );
    return;
  }

  // Assets estáticos (_next/static, imagens, fontes): Cache First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            const resClone = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, resClone));
            return res;
          })
      )
    );
    return;
  }
});
