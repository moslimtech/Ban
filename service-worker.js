const CACHE_NAME = "ban-cache-v5";
const urlsToCache = [
  "/Ban/",
  "/Ban/index.html",
  "/Ban/dashboard/index.html",
  "/Ban/dashboard/dashboard.js",
  "/Ban/offline.html"
];

// تثبيت الكاش لأول مرة
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// تفعيل و تنظيف الكاش القديم
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
});

// جلب البيانات مع الكاش الديناميكي + صفحة أوفلاين
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // لو الطلب نجح → خزنه في الكاش وارجعه
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // لو النت مقطوع → رجع من الكاش أو offline.html
        return caches.match(event.request).then((response) => {
          return response || caches.match("/Ban/offline.html");
        });
      })
  );
});
