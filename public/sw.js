/* Susma — Service Worker
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

// ---- Okunmamış bildirim sayacı (uygulama ikonu rozeti / Badging API) ----
// Not: iOS PWA ikonunu değiştirmek mümkün değil; standart yol ikon üstünde rozettir.
function badgeStore(mode, value) {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open('susma-badge', 1);
    } catch (e) {
      resolve(0);
      return;
    }
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => resolve(0);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      if (mode === 'get') {
        const g = store.get('count');
        g.onsuccess = () => resolve(g.result || 0);
        g.onerror = () => resolve(0);
      } else {
        store.put(value, 'count');
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => resolve(value);
      }
    };
  });
}

async function applyBadge(count) {
  try {
    if (count > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(count);
    else if (count <= 0 && self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  } catch (e) {
    /* desteklenmiyorsa yoksay */
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'Susma', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Susma';
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

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Okunmamış sayacını artır ve uygulama ikonuna rozet koy
      const count = (await badgeStore('get')) + 1;
      await badgeStore('set', count);
      await applyBadge(count);
    })(),
  );
});

// Akış görüntülenince (istemci) okundu say → rozet temizle
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'clear-badge') {
    event.waitUntil(
      (async () => {
        await badgeStore('set', 0);
        await applyBadge(0);
      })(),
    );
  }
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
