// Malo 웹앱 Service Worker: 생성·보고서 완료 알림만 담당해요 (캐시는 하지 않아요)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (_) {
    d = { body: e.data ? e.data.text() : '' };
  }
  // 잠금화면엔 일반 완료 문구만 (서버가 보낸 그대로)
  e.waitUntil(
    self.registration.showNotification(d.title || 'Malo', {
      body: d.body || '준비가 끝났어요.',
      tag: d.tag || 'malo',
      icon: '/icon.png',
      data: { url: d.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  // 같은 주소(origin)의 경로만 열어요
  let path = '/';
  try {
    const u = new URL(e.notification.data && e.notification.data.url ? e.notification.data.url : '/', self.location.origin);
    if (u.origin === self.location.origin) path = u.pathname + u.search;
  } catch (_) {}
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(path);
          return c.focus();
        }
      }
      return self.clients.openWindow(path);
    }),
  );
});
