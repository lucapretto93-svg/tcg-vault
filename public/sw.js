/* Service worker TCG Vault: installabilità PWA + notifiche push del Radar CardTrader. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "TCG Vault", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "TCG Vault — Radar CardTrader";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      data: { url: payload.url || "/dashboard" },
      badge: "/favicon.ico",
      icon: "/favicon.ico",
      tag: payload.tag || "cardtrader-deal",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
