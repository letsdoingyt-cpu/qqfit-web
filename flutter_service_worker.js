// Веб-версия приложения QQFIT снята с qqfit.ru: теперь здесь сайт приложения.
// Этот файл заменяет старый service worker у тех, кто открывал или
// устанавливал веб-версию: удаляет её кэш, отключается сам и перезагружает
// вкладку, чтобы открылся сайт.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    var clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(function (c) { c.navigate(c.url); });
  })());
});
