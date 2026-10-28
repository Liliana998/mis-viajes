// Mis Viajes - service worker.
// A diferencia de las otras aplicaciones, guarda la INTERFAZ (no los datos)
// para poder abrirla sin internet. Los datos sin conexion viven cifrados en
// el almacenamiento del dispositivo (almacen.js), nunca en esta cache.
// Las llamadas al servicio de Google nunca se guardan.
const VERSION_MV = 'mv-v2.1-4';
const INTERFAZ = ['./', 'index.html', 'app.css', 'config.js', 'almacen.js', 'datos.js',
  'recordatorios.js', 'vistas.js', 'acceso.js', 'manifest.webmanifest', 'icono-192.png', 'favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION_MV).then(function (c) { return c.addAll(INTERFAZ.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
    .then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (x) { return x !== VERSION_MV; }).map(function (x) { return caches.delete(x); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    // Primero internet; sin conexion, la interfaz guardada (conserva ?parametros de "Compartir").
    e.respondWith(fetch(e.request).then(function (r) {
      const copia = r.clone();
      caches.open(VERSION_MV).then(function (c) { c.put('index.html', copia); });
      return r;
    }).catch(function () { return caches.match('index.html'); }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (guardado) {
    const red = fetch(e.request).then(function (r) {
      if (r.ok) { const copia = r.clone(); caches.open(VERSION_MV).then(function (c) { c.put(e.request, copia); }); }
      return r;
    }).catch(function () { return guardado; });
    return guardado || red;
  }));
});
