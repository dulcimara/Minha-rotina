// Service worker do Minha Rotina.
// Hoje ele só permite instalar o app e mostrar notificações.
// Não guarda nada em cache, para o app sempre abrir na versão mais nova.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Necessário para o Chrome considerar o app instalável; deixa a internet responder normalmente.
self.addEventListener("fetch", () => {});

// Ao tocar na notificação, abre (ou traz para frente) o app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});
