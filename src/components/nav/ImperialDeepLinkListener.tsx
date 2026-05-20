// PR-P0-6: Hardened deep-link listener.
//
// - Receives SW `deep-link` postMessages (and a URL-query fallback `?from=push`)
//   and routes via React Router.
// - Preserves unauthenticated returnTo: captures the intended path, sends user
//   to /auth, and flushes it post-SIGNED_IN.
// - Click-race guard: ignores identical deep links arriving within 500ms.
// - Background → foreground: flushes a pending deep link when the tab becomes
//   visible (covers iOS where SW messages may be coalesced).
//
// No money-flow side effects. Pure navigation + a tiny localStorage key.

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PENDING_LS = "phonara:push:pending_deep_link";
const RACE_WINDOW_MS = 500;

const SUPPORTED_PREFIXES = [
  "/dashboard",
  "/wallet",
  "/packages",
  "/vip",
  "/apex",
  "/duel",
  "/cup",
  "/empire",
  "/trust",
  "/legal",
  "/phon",
  "/arena",
  "/games",
  "/lobby",
];

function isSupportedPath(path: string): boolean {
  if (!path || !path.startsWith("/")) return false;
  return SUPPORTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  );
}

function dispatchFocusEvent(intent: string | null) {
  if (!intent) return;
  try {
    window.dispatchEvent(new CustomEvent("phonara:imperial-focus", { detail: { intent } }));
  } catch {}
}

function parseDeepLink(raw: string): { path: string; intent: string | null } | null {
  if (!raw) return null;
  let path = raw;
  let intent: string | null = null;
  try {
    const u = raw.startsWith("http") ? new URL(raw) : new URL(raw, window.location.origin);
    path = `${u.pathname}${u.search}${u.hash}`;
    intent = u.searchParams.get("intent");
  } catch {
    // treat as raw path
  }
  if (!isSupportedPath(path)) return null;
  return { path, intent };
}

function readPending(): string | null {
  try { return localStorage.getItem(PENDING_LS); } catch { return null; }
}
function writePending(v: string) {
  try { localStorage.setItem(PENDING_LS, v); } catch {}
}
function clearPending() {
  try { localStorage.removeItem(PENDING_LS); } catch {}
}

export default function ImperialDeepLinkListener(): null {
  const navigate = useNavigate();
  const location = useLocation();
  const lastRef = useRef<{ url: string; at: number }>({ url: "", at: 0 });
  const authedRef = useRef<boolean>(false);
  const handleDeepLink = useRef<(raw: string) => void>(() => {});

  useEffect(() => {
    handleDeepLink.current = (raw: string) => {
      const parsed = parseDeepLink(raw);
      if (!parsed) return;
      const now = Date.now();
      if (parsed.path === lastRef.current.url && now - lastRef.current.at < RACE_WINDOW_MS) return;
      lastRef.current = { url: parsed.path, at: now };

      if (!authedRef.current) {
        writePending(parsed.path);
        const returnTo = encodeURIComponent(parsed.path);
        navigate(`/auth?returnTo=${returnTo}`, { replace: false });
        return;
      }

      navigate(parsed.path);
      dispatchFocusEvent(parsed.intent);
    };
  }, [navigate]);

  // Track auth state + flush pending on SIGNED_IN.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      authedRef.current = !!data.session;
      const pending = readPending();
      if (authedRef.current && pending) {
        clearPending();
        handleDeepLink.current(pending);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      authedRef.current = !!session;
      if (event === "SIGNED_IN") {
        const pending = readPending();
        if (pending) {
          clearPending();
          setTimeout(() => handleDeepLink.current(pending), 0);
        }
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // SW message bridge: `{type:"deep-link", url}`.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (ev: MessageEvent) => {
      const d = ev.data;
      if (!d || typeof d !== "object" || d.type !== "deep-link" || typeof d.url !== "string") return;
      handleDeepLink.current(d.url);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  // URL fallback: `?from=push` on first navigation after notification click.
  useEffect(() => {
    const search = location.search;
    if (!search || !search.includes("from=push")) return;
    const path = `${location.pathname}${location.search}${location.hash}`;
    handleDeepLink.current(path);
  }, [location.pathname, location.search, location.hash]);

  // Background → foreground: flush any pending deep link once authed.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const pending = readPending();
      if (pending && authedRef.current) {
        clearPending();
        handleDeepLink.current(pending);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return null;
}
