/* Rede apenas. O fetch existe para o navegador oferecer instalação. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Navegação fica com o navegador para o cookie de sessão ir no app instalado.
  if (event.request.mode === "navigate") return;
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  let dados = {
    titulo: "Novo chamado",
    corpo: "Abriu um chamado novo.",
    url: "/lider",
  };
  try {
    if (event.data) dados = { ...dados, ...event.data.json() };
  } catch {
    /* mantém o texto padrão */
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/icon/192",
      badge: "/icon/192",
      data: { url: dados.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/lider", self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (janelas) => {
      for (const janela of janelas) {
        if (janela.url.startsWith(self.location.origin) && "focus" in janela) {
          if ("navigate" in janela) {
            await janela.navigate(destino.href);
          }
          return janela.focus();
        }
      }
      return self.clients.openWindow(destino.href);
    }),
  );
});
