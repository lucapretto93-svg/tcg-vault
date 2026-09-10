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
  const fallback = new URL("/dashboard", self.location.origin);
  let target = fallback;
  try {
    const candidate = new URL(event.notification.data?.url || fallback.href, self.location.origin);
    if (
      candidate.origin === self.location.origin ||
      (candidate.protocol === "https:" &&
        ["cardtrader.com", "www.cardtrader.com"].includes(candidate.hostname) &&
        !candidate.username && !candidate.password)
    ) target = candidate;
  } catch {
    // Older or malformed notifications retain the dashboard fallback.
  }
  const url = target.href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
