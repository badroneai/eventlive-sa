const CACHE_NAME = 'eventlive-static-1783474806863';
const PRECACHE = [
  "./",
  "./index.html",
  "./events.html",
  "./llms.txt",
  "./ai-policy.txt",
  "./robots.txt",
  "./sitemap.xml",
  "./cities.html",
  "./cities.json",
  "./categories.html",
  "./categories.json",
  "./audiences.html",
  "./manifest.webmanifest",
  "./search-index.json",
  "./audiences.json",
  "./today-events.html",
  "./today.html",
  "./today.json",
  "./live-status.json",
  "./updates.html",
  "./updates.json",
  "./this-month.html",
  "./this-month.json",
  "./regions.html",
  "./regions.json",
  "./source-coverage-gaps.html",
  "./source-coverage-gaps.json",
  "./source-health.html",
  "./source-health.json",
  "./organizer-intake.html",
  "./organizer-intake.json",
  "./activation.json",
  "./readiness.html",
  "./readiness.json",
  "./events.ics",
  "./feeds/all.ics",
  "./feeds/all.xml",
  "./feeds/all.json",
  "./feeds/index.json"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const isNavigationRequest = event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('Accept')?.includes('text/html'));
  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone()).catch(() => {});
          return response;
        });
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
