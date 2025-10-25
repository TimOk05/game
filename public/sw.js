// Service Worker для PWA
const CACHE_NAME = 'fantasy-quest-v1';
const STATIC_CACHE = 'static-v1';

// Файлы для кеширования
const STATIC_FILES = [
    '/',
    '/index.html',
    '/app.css',
    '/app.js',
    '/assets/media/menu-campfire.mp4',
    '/assets/media/menu-campfire.webm',
    '/assets/media/menu-campfire.mp3',
    '/assets/media/game-ambient.mp3'
];

// Файлы, которые НЕ кешируются
const NO_CACHE_PATTERNS = [
    '/api/',
    '/events/'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('SW: Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
        .then((cache) => {
            console.log('SW: Caching static files');
            return cache.addAll(STATIC_FILES);
        })
        .then(() => {
            console.log('SW: Installation complete');
            return self.skipWaiting();
        })
        .catch((error) => {
            console.error('SW: Installation failed', error);
        })
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('SW: Activating...');

    event.waitUntil(
        caches.keys()
        .then((cacheNames) => {
            return Promise.all(
                cacheNames
                .filter((cacheName) => {
                    return cacheName !== STATIC_CACHE;
                })
                .map((cacheName) => {
                    console.log('SW: Deleting old cache', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
        .then(() => {
            console.log('SW: Activation complete');
            return self.clients.claim();
        })
    );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Проверяем, нужно ли кешировать этот запрос
    const shouldCache = !NO_CACHE_PATTERNS.some(pattern =>
        url.pathname.startsWith(pattern)
    );

    if (!shouldCache) {
        // Для API и событий - всегда сеть
        return;
    }

    // Для статических файлов - stale-while-revalidate
    if (request.method === 'GET') {
        event.respondWith(
            caches.open(STATIC_CACHE)
            .then((cache) => {
                return cache.match(request)
                    .then((cachedResponse) => {
                        // Если есть кеш - возвращаем его и обновляем в фоне
                        if (cachedResponse) {
                            // Обновляем кеш в фоне
                            fetch(request)
                                .then((networkResponse) => {
                                    if (networkResponse.ok) {
                                        cache.put(request, networkResponse.clone());
                                    }
                                })
                                .catch(() => {
                                    // Игнорируем ошибки обновления
                                });

                            return cachedResponse;
                        }

                        // Если нет кеша - загружаем из сети
                        return fetch(request)
                            .then((networkResponse) => {
                                if (networkResponse.ok) {
                                    cache.put(request, networkResponse.clone());
                                }
                                return networkResponse;
                            })
                            .catch(() => {
                                // Если сеть недоступна - возвращаем оффлайн страницу
                                if (request.destination === 'document') {
                                    return cache.match('/index.html');
                                }
                            });
                    });
            })
        );
    }
});

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Обработка push уведомлений (для будущего использования)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/assets/icons/icon-192.png',
            badge: '/assets/icons/icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});