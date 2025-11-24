const CACHE_NAME = 'sos-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    'https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('開啟快取');
                return cache.addAll(urlsToCache);
            })
    );
});

// 啟動 Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('刪除舊快取:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 攔截請求
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 快取命中 - 返回快取的資源
                if (response) {
                    return response;
                }

                // 克隆請求
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // 檢查是否為有效的回應
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // 克隆回應
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});
