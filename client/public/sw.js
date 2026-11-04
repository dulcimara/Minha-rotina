// Service worker do Minha Rotina.
// Permite instalar o app e receber notificações, mesmo com o app fechado.
// O app sempre vem da internet (versão mais nova). Só a página "sem internet"
// fica guardada, para aparecer quando o celular estiver sem conexão.

const CACHE = "minha-rotina-offline-v1";
const OFFLINE_FILES = ["/offline.html", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(OFFLINE_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Ao abrir uma tela: tenta a internet; se não houver conexão, mostra a página "sem internet".
// Os outros pedidos (dados, imagens) seguem normalmente pela internet.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline.html").then((r) => r || Response.error())),
  );
});

// Aviso enviado pelo servidor (função enviar-avisos do Supabase).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Minha Rotina", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const appOnScreen = clients.some((c) => c.visibilityState === "visible");
      // Com o app aberto na tela, ele mesmo toca e fala o aviso: a notificação vem sem som.
      return self.registration.showNotification(data.title || "Minha Rotina", {
        body: data.body || "",
        tag: data.tag,
        icon: data.icon || "/icon-192.png",
        badge: data.icon || "/icon-192.png",
        silent: Boolean(data.silent) || appOnScreen,
        renotify: !appOnScreen,
        vibrate: data.silent ? undefined : [300, 150, 300],
        data: { url: data.url || "/" },
      });
    }),
  );
});

// Ao tocar na notificação, abre (ou traz para frente) o app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          if (url !== "/" && "navigate" in client) client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
