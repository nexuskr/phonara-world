import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import i18n from "i18next";
import { i18nReady } from "./lib/i18n";
import { detectPreferredLocale } from "./hooks/use-preferred-locale";
import { installViewportLock } from "./lib/viewport-lock";
import { installLayoutShiftMonitor } from "./lib/layout-shift-monitor";
import { watchMotionClass } from "./lib/app-settings";

// First-visit auto locale: respect explicit ?lang=/persisted choice; otherwise detect.
try {
  const url = new URL(window.location.href);
  const persisted = localStorage.getItem("phonara-lang");
  if (!persisted && !url.searchParams.get("lang")) {
    const detected = detectPreferredLocale();
    if (detected && i18n.language?.split("-")[0] !== detected) {
      i18n.changeLanguage(detected);
    }
  }
} catch {}

// Lock viewport height before first paint to prevent mobile address-bar jitter.
installViewportLock();
// Apply user's reduce-motion preference as <html class="reduce-motion">.
watchMotionClass();
// Diagnose layout shifts (toasts in dev / when phonara:debug-cls=1).
installLayoutShiftMonitor();

// P5 — wait for active locale chunk to resolve before first paint to avoid
// flash-of-keys. Fail-open: if it errors, render anyway (i18n returns keys).
const boot = () => createRoot(document.getElementById("root")!).render(<App />);
i18nReady.then(boot, boot);
