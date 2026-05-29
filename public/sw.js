/* Ses Aç — Service Worker
 * Görevler: install / activate / push / notificationclick
 * Not: Push yalnızca HTTPS (veya localhost) altında çalışır.
 */

self.addEventListener('install', () => {
  // Yeni sürüm hemen devreye girsin
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'Ses Aç', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Ses Aç';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/badge-72.png',
    lang: 'tr',
    data: payload.data || {},
    tag:
      payload.data && payload.data.announcementId
        ? 'duyuru-' + payload.data.announcementId
        : undefined,
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/feed';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Açık bir pencere varsa onu öne al ve hedefe yönlendir
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch (e) {
              /* yoksay */
            }
          }
          return;
        }
      }

      // Yoksa yeni pencere aç
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
