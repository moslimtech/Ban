// 📦 ========== كود الكاش ==========
const CACHE_NAME = "ban-cache-v11";
const urlsToCache = [
  "/Ban/",
  "/Ban/index.html",
  "/Ban/dashboard/index.html",
  "/Ban/dashboard/dashboard.js",
  "/Ban/offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match("/Ban/offline.html")))
  );
});

// 📬 ========== كود Firebase Messaging ==========
importScripts("https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCqVACpFrZ7Q9kgRsgIkG7QGFjGDsi7yrk",
  authDomain: "ban-notification.firebaseapp.com",
  projectId: "ban-notification",
  storageBucket: "ban-notification.firebasestorage.app",
  messagingSenderId: "493526281687",
  appId: "1:493526281687:web:1bf86cc1fe4233a6f12f92",
  measurementId: "G-QKTEM22CXT"
});

const messaging = firebase.messaging();

// استقبال الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Received background message:", payload);

  const notificationTitle = payload.notification?.title || "📢 إشعار جديد";
  const notificationOptions = {
    body: payload.notification?.body || "لديك إشعار جديد",
    icon: "/Ban/icons/icon-192.png", // ضع مسار أيقونتك إن وُجدت
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
