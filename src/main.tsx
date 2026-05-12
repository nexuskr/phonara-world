import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import i18n from "i18next";
import "./lib/i18n";
import { detectPreferredLocale } from "./hooks/use-preferred-locale";
import { prefetchCatalog } from "./lib/catalog-cache";

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

createRoot(document.getElementById("root")!).render(<App />);

prefetchCatalog();
