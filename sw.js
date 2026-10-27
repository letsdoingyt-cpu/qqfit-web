// Кэш сайта qqfit.ru на телефоне: повторный заход открывается сразу,
// даже на медленной сети, и ничего не перекачивает.
// Версию подставляет сборка (хэш всех файлов), так что любая выкладка
// меняет этот файл: браузер сам замечает новый sw.js, новая версия удаляет
// старый кэш, и со следующего захода человек видит свежий сайт.
// Чтобы выключить кэш насовсем, положите сюда тот же «самоубийца», что
// лежит в flutter_service_worker.js.
var CACHE = 'qqfit-site-950eef7a25';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// адрес без ?utm=… и #якоря, чтобы одна страница не лежала в кэше десять раз
function keyFor(url) {
  var u = new URL(url, self.location.href);
  return u.origin === self.location.origin ? u.origin + u.pathname : null;
}

function store(cache, key, res) {
  if (res && res.ok && res.type === 'basic') return cache.put(key, res.clone());
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var key = keyFor(req.url);
  if (!key || /\/(sw|flutter_service_worker)\.js$/.test(key)) return;
  event.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(key).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var saved = store(cache, key, res);
        if (saved) event.waitUntil(saved.catch(function () {}));
        return res;
      });
    });
  }));
});

// страница присылает список того, что уже скачала; берём из кэша браузера
self.addEventListener('message', function (event) {
  var data = event.data;
  if (!data || data.type !== 'cache' || !Array.isArray(data.urls)) return;
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return Promise.all(data.urls.map(function (url) {
      var key = keyFor(url);
      if (!key || /\/(sw|flutter_service_worker)\.js$/.test(key)) return null;
      return cache.match(key).then(function (hit) {
        return hit || fetch(key).then(function (res) { return store(cache, key, res); });
      }).catch(function () {});
    }));
  }));
});
