import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import i18n from "i18next";
import "./lib/i18n";
import { detectPreferredLocale } from "./hooks/use-preferred-locale";
import { prefetchCatalog } from "./lib/catalog-cache";
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

createRoot(document.getElementById("root")!).render(<App />);

prefetchCatalog();
