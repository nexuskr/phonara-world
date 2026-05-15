/**
 * Phonara Service Worker — Phase 4 (PWA + Push 통합)
 *
 * - 캐시 전략:
 *   · precache: 핵심 셸 + 매니페스트 + 아이콘 + 핵심 SFX 6종
 *   · HTML navigations → network-first (3s timeout, fallback offline.html)
 *   · /assets/*  (해시드 정적자산) → cache-first (immutable)
 *   · /sounds/*  → stale-while-revalidate
 *   · 이미지/폰트 → cache-first (30d)
 * - Push/postMessage 알림 (기존 PR-24 동작 유지)
 *
 * Lovable 미리보기에서는 registerSW.ts가 등록을 차단하므로
 * 이 파일은 production 도메인에서만 활성화된다.
 */

// 배포 시 build pipeline이 __BUILD_ID__를 치환하지 않더라도 안전하도록 fallback.
const CACHE_VERSION = "phonara-v1-2026-05-15";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME_HTML = `${CACHE_VERSION}-html`;
const RUNTIME_ASSETS = `${CACHE_VERSION}-assets`;
const RUNTIME_SOUNDS = `${CACHE_VERSION}-sounds`;
const RUNTIME_IMAGES = `${CACHE_VERSION}-images`;

const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/manifest.en.webmanifest",
  "/manifest.ko.webmanifest",
  "/manifest.ja.webmanifest",
  "/manifest.vi.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  // 핵심 SFX (없으면 install이 깨지지 않도록 개별 fetch 실패 무시)
  "/sounds/common/sfx/spin_start.mp3",
  "/sounds/common/sfx/reel_stop.mp3",
  "/sounds/common/sfx/button_click.mp3",
  "/sounds/common/sfx/coin_drop.mp3",
  "/sounds/common/sfx/big_win_trigger.mp3",
  "/sounds/common/sfx/legendary_win.mp3",
];

const ALL_CACHES = [PRECACHE, RUNTIME_HTML, RUNTIME_ASSETS, RUNTIME_SOUNDS, RUNTIME_IMAGES];

// ---------- install / activate ----------
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    // 개별 실패 허용 (없는 사운드 파일이 install 전체를 깨지 않도록)
    await Promise.all(
      PRECACHE_URLS.map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => { /* skip */ }),
      ),
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("phonara-") && !ALL_CACHES.includes(k))
        .map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

// ---------- fetch routing ----------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigation → network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirstHtml(req));
    return;
  }

  // 해시드 정적자산
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(req, RUNTIME_ASSETS));
    return;
  }

  // 사운드
  if (url.pathname.startsWith("/sounds/")) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_SOUNDS));
    return;
  }

  // 이미지/폰트
  if (/\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, RUNTIME_IMAGES));
    return;
  }
});

async function networkFirstHtml(req) {
  const cache = await caches.open(RUNTIME_HTML);
  try {
    const fresh = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
    ]);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return offline || new Response("offline", { status: 503 });
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetchPromise;
}

// ---------- 알림 (PR-24 유지) ----------
self.addEventListener("message", (e) => {
  const data = e.data || {};
  if (data.type === "ADMIN_NOTIFY") {
    self.registration.showNotification(data.title || "Phonara Mission Control", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "admin-anomaly",
      requireInteraction: false,
      data: { url: data.url || "/admin/ops/errors" },
    });
  }
  if (data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (e) => {
  let payload = {};
  try { payload = e.data ? e.data.json() : {}; } catch { /* */ }
  const title = payload.title || "🚨 Phonara Alert";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "관리자 콘솔에서 확인하세요",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag || "admin-push",
      data: { url: payload.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/admin";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.focus();
          if ("navigate" in w) try { w.navigate(url); } catch { /* */ }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
