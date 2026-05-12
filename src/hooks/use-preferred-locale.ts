import { useEffect } from "react";
import i18n from "i18next";

/**
 * usePreferredLocale — auto-detect once on first visit.
 *
 * Priority:
 *   1. ?lang= query string (handled by i18next-browser-languagedetector)
 *   2. localStorage `phonara-lang` (already persisted)
 *   3. browser navigator.language → ko/en/ja/vi
 *   4. Intl timezone heuristic (Asia/Tokyo, Asia/Ho_Chi_Minh, Asia/Seoul)
 *
 * IP-based detection is intentionally NOT done client-side (privacy + no roundtrip).
 * Backend can override via Accept-Language at edge if needed later.
 */
const SUPPORTED = ["ko", "en", "ja", "vi"] as const;
type Lang = (typeof SUPPORTED)[number];

function fromTimezone(): Lang | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Tokyo")) return "ja";
    if (tz.includes("Ho_Chi_Minh") || tz.includes("Hanoi") || tz.includes("Saigon")) return "vi";
    if (tz.includes("Seoul")) return "ko";
  } catch {}
  return null;
}

function fromNavigator(): Lang | null {
  if (typeof navigator === "undefined") return null;
  const langs = (navigator.languages || [navigator.language || ""]).map((l) =>
    (l || "").toLowerCase().split("-")[0]
  );
  for (const l of langs) {
    if ((SUPPORTED as readonly string[]).includes(l)) return l as Lang;
  }
  return null;
}

export function detectPreferredLocale(): Lang {
  return fromNavigator() ?? fromTimezone() ?? "ko";
}

export function usePreferredLocale() {
  useEffect(() => {
    try {
      const persisted = localStorage.getItem("phonara-lang");
      const url = new URL(window.location.href);
      if (persisted || url.searchParams.get("lang")) return; // user/explicit choice wins
      const detected = detectPreferredLocale();
      if (detected && i18n.language?.split("-")[0] !== detected) {
        i18n.changeLanguage(detected);
      }
    } catch {}
  }, []);
}

export default usePreferredLocale;
