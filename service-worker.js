/* Aufräum-Service-Worker: Die Lernprofi-App ist nach ./lernprofi/ umgezogen.
   Diese Datei ersetzt den alten Service Worker auf bereits installierten
   Geräten, löscht dessen Caches und meldet sich selbst ab. Danach übernimmt
   die Weiterleitung in index.html. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});
