/* ============================================================
   Service Worker für die Lern-App (PWA)
   Strategie:
   - HTML/Seiten: NETWORK-FIRST -> immer die neueste Version laden,
     offline als Rückfall aus dem Cache. (verhindert veraltete Inhalte)
   - Übrige Dateien (manifest, icon): CACHE-FIRST (schnell & offline).
   Der Fortschritt selbst liegt im localStorage (nicht hier).
   ============================================================ */

// Version bei jeder Änderung hochzählen -> alte Caches werden entfernt.
const CACHE_NAME = "lern-app-v72";

const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting(); // neue Version sofort übernehmen
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");

  if (isHTML) {
    // NETWORK-FIRST: neueste Seite laden, Cache aktualisieren, offline zurückfallen
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
  } else {
    // CACHE-FIRST für statische Dateien
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return resp;
        })
      )
    );
  }
});
