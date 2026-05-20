// Phonara Web Push Service Worker — PR-P0-6 hardened.
// - tag dedup uses notification id when present (kind fallback).
// - notificationclick is mutex'd to avoid focus/navigate races on rapid taps.
// - Tries postMessage `deep-link` to an existing client first (in-app router),
//   falls back to client.navigate, then openWindow with `?from=push`.
// - Broadcasts `push-received` to clients for local daily-cap UX.

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "Phonara", body: "", url: "/" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}

  const tag = data.id || data.kind || "phonara";
  const url = data.url || "/";

  event.waitUntil((async () => {
    try {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) {
        try { c.postMessage({ type: "push-received", kind: data.kind || null, url }); } catch (_) {}
      }
    } catch (_) {}

    await self.registration.showNotification(data.title || "Phonara", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url, id: data.id || null, kind: data.kind || null },
      tag,
      renotify: false,
    });
  })());
});

// Mutex + dedupe — collapses duplicate clicks on the same notification.
self.__nc_lock = self.__nc_lock || Promise.resolve();
self.__nc_seen = self.__nc_seen || new Map();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "/";
  const dedupeKey = data.id || data.kind || url;

  const now = Date.now();
  const last = self.__nc_seen.get(dedupeKey) || 0;
  if (now - last < 1000) return;
  self.__nc_seen.set(dedupeKey, now);
  if (self.__nc_seen.size > 32) {
    for (const [k, t] of self.__nc_seen) {
      if (now - t > 60000) self.__nc_seen.delete(k);
    }
  }

  const work = self.__nc_lock.then(async () => {
    try {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (clients.length > 0) {
        const c = clients[0];
        try {
          await c.focus();
          try { c.postMessage({ type: "deep-link", url }); }
          catch (_) { try { await c.navigate(url); } catch (_) {} }
          return;
        } catch (_) {
          try { await c.navigate(url); return; } catch (_) {}
        }
      }
      const sep = url.includes("?") ? "&" : "?";
      await self.clients.openWindow(`${url}${sep}from=push`);
    } catch (_) {}
  });
  self.__nc_lock = work.catch(() => {});
  event.waitUntil(work);
});
