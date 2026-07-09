/* ============================================================
   Service Worker für die Felix-App (PWA)
   Ermöglicht das Laden der App ohne Internet (offline).
   Der Fortschritt selbst liegt im localStorage (nicht hier).
   ============================================================ */

// Version des Caches – bei Änderungen hochzählen, damit Geräte neu laden.
const CACHE_NAME = "felix-app-v1";

// Dateien, die für den Offline-Betrieb gespeichert werden.
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

// Installation: alle wichtigen Dateien in den Cache legen.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // sofort aktiv werden
});

// Aktivierung: alte Caches aufräumen.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Anfragen zuerst aus dem Cache bedienen (schnell & offline-fähig),
// bei Bedarf aus dem Netz nachladen und ergänzen.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          // Kopie im Cache ablegen (nur gültige Antworten)
          if (resp && resp.status === 200 && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => cached); // offline & nicht im Cache -> nichts
    })
  );
});
