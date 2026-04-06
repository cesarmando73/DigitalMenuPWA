const CACHE_NAME = 'cas-padri-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

// Instalación: Cachear archivos estáticos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpiando caché antigua');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones para modo offline (con manejo de errores robusto)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retornar de caché si existe
      if (response) {
        return response;
      }

      // De lo contrario, intentar red
      return fetch(event.request).then((networkResponse) => {
        // No cacheamos respuestas de error o de terceros (estilo Google Fonts) aquí,
        // a menos que sea una respuesta válida del servidor propio.
        return networkResponse;
      }).catch((err) => {
        // Error silencioso para la consola, devolviendo una respuesta offline minimalista si es HTML
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/');
        }
        return new Response('Problema de conexión', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// --- SOPORTE PARA NOTIFICACIONES PUSH ---
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Cas Padrí', body: event.data.text() };
    }
  }

  const title = data.title || 'Cas Padrí';
  const options = {
    body: data.body || '¡Tenemos novedades para ti!',
    icon: '/icons/icon-192x192.png',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Manejar clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
