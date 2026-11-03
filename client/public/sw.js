// Service worker do Minha Rotina.
// Permite instalar o app e receber notificações, mesmo com o app fechado.
// Não guarda nada em cache, para o app sempre abrir na versão mais nova.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Necessário para o Chrome considerar o app instalável; deixa a internet responder normalmente.
self.addEventListener("fetch", () => {});

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
        icon: "/icon-192.png",
        badge: "/icon-192.png",
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
