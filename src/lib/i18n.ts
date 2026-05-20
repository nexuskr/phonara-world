import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import jaPartial from "@/locales/ja";
import viPartial from "@/locales/vi";
import ptPartial from "@/locales/pt";
import esPartial from "@/locales/es";
import zhPartial from "@/locales/zh";

/**
 * Phonara i18n — Phase 4 P4-E (ko + en + ja + vi + pt + es + zh)
 *
 * P5 split: ko/en bundles are now in separate dynamic-import chunks
 * (`src/locales/ko.ts`, `src/locales/en.ts`). Only the active language
 * (and minimum fallbacks) is loaded at boot. Other languages are
 * fetched lazily on `languageChanged`.
 *
 * ja/vi/pt/es/zh remain partial-static (small files, fall back to en → ko).
 */

const SUPPORTED = ["ko", "en", "ja", "vi", "pt", "es", "zh"] as const;
type Lang = (typeof SUPPORTED)[number];

const NAMESPACES = [
  "common", "nav", "topbar", "hubs", "auth", "onboarding", "landing",
  "wallet", "walletToast", "referral", "referralPage", "dmComposer",
  "ugc", "withdrawQueue", "live", "jackpot", "faq", "convert",
  "dashboard", "missions", "admin", "support", "secureWallet",
  "offline", "forgot", "reset", "completeProfile", "unsubscribe",
  "status", "packages", "profile", "trust", "settlements", "lang",
  "guide", "roulette", "seasonPass", "quests", "achievements", "hof",
  "empire", "aibot",
];

// --- Lazy loaders --------------------------------------------------------
const loaders: Record<Lang, () => Promise<Record<string, Record<string, unknown>>>> = {
  ko: () => import("@/locales/ko").then((m) => m.default as Record<string, Record<string, unknown>>),
  en: () => import("@/locales/en").then((m) => m.default as Record<string, Record<string, unknown>>),
  ja: async () => jaPartial as unknown as Record<string, Record<string, unknown>>,
  vi: async () => viPartial as unknown as Record<string, Record<string, unknown>>,
  pt: async () => ptPartial as unknown as Record<string, Record<string, unknown>>,
  es: async () => esPartial as unknown as Record<string, Record<string, unknown>>,
  zh: async () => zhPartial as unknown as Record<string, Record<string, unknown>>,
};

const loaded = new Set<Lang>();

async function loadLanguage(lng: Lang): Promise<void> {
  if (loaded.has(lng)) return;
  try {
    const bundle = await loaders[lng]();
    for (const ns of NAMESPACES) {
      const data = (bundle as any)?.[ns];
      if (data) i18n.addResourceBundle(lng, ns, data, true, true);
    }
    loaded.add(lng);
  } catch (e) {
    console.error("[i18n] failed to load language:", lng, e);
  }
}

function detectInitial(): Lang {
  try {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("lang");
      if (q && (SUPPORTED as readonly string[]).includes(q)) return q as Lang;
      const ls = localStorage.getItem("phonara-lang");
      if (ls) {
        const b = ls.split("-")[0];
        if ((SUPPORTED as readonly string[]).includes(b)) return b as Lang;
      }
      const nav = (navigator.language || "").split("-")[0];
      if ((SUPPORTED as readonly string[]).includes(nav)) return nav as Lang;
    }
  } catch {}
  return "ko";
}

const initial: Lang = detectInitial();

// Init with empty resources — bundles are added via addResourceBundle below.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {},
    lng: initial,
    fallbackLng: { ja: ["en", "ko"], vi: ["en", "ko"], pt: ["en", "ko"], es: ["en", "ko"], zh: ["en", "ko"], default: ["ko"] },
    supportedLngs: SUPPORTED as unknown as string[],
    ns: NAMESPACES,
    defaultNS: "common",
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lang",
      lookupLocalStorage: "phonara-lang",
      caches: ["localStorage"],
    },
    react: { useSuspense: false },
  });

/**
 * Resolves once the active language (and minimum fallbacks) are bundled.
 * `main.tsx` awaits this before the first React render to avoid a flash
 * of translation keys.
 */
export const i18nReady: Promise<void> = (async () => {
  await loadLanguage(initial);
  if (initial !== "ko") await loadLanguage("ko"); // global fallback
  if ((["ja", "vi", "pt", "es", "zh"] as Lang[]).includes(initial) && !loaded.has("en")) {
    await loadLanguage("en"); // partial locales → en → ko fallback chain
  }
})();

// Lazy-load on language change (covers user-driven switches).
i18n.on("languageChanged", (lng) => {
  const base = (lng || "ko").split("-")[0];
  if ((SUPPORTED as readonly string[]).includes(base)) {
    void loadLanguage(base as Lang);
  }
  syncDocument(lng);
});

// --- Document meta sync (unchanged from previous impl) ------------------
const META = {
  ko: {
    title: "Phonara — 왕좌는 클릭 한 번으로 시작된다",
    description: "PHONARA Empire — 임페리얼 골드 정산 플랫폼. 창립 멤버 100석 한정, 장기 골드 등급으로 폰 하나로 글로벌 수익을 시작하세요.",
    manifest: "/manifest.ko.webmanifest",
    appleTitle: "Phonara",
  },
  en: {
    title: "Phonara — Your throne begins with one click",
    description: "PHONARA Empire — Imperial gold settlement platform. Founders only, long-term gold tier — your phone as a global earnings engine.",
    manifest: "/manifest.en.webmanifest",
    appleTitle: "Phonara",
  },
  ja: {
    title: "Phonara — 王座はワンクリックから始まる",
    description: "PHONARA Empire — 帝国ゴールド精算プラットフォーム。創設メンバー限定、長期ゴールド階層。",
    manifest: "/manifest.ja.webmanifest",
    appleTitle: "Phonara",
  },
  vi: {
    title: "Phonara — Ngai vàng bắt đầu chỉ bằng một cú nhấp",
    description: "PHONARA Empire — Nền tảng thanh toán hoàng kim Imperial. Chỉ thành viên sáng lập, hạng vàng dài hạn.",
    manifest: "/manifest.vi.webmanifest",
    appleTitle: "Phonara",
  },
} as const;

const setMeta = (sel: string, attr: string, val: string) => {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (el) el.setAttribute(attr, val);
};

const OG_LOCALE: Record<"ko" | "en" | "ja" | "vi", string> = {
  ko: "ko_KR", en: "en_US", ja: "ja_JP", vi: "vi_VN",
};

const syncDocument = (lng: string) => {
  if (typeof document === "undefined") return;
  const base = (lng || "ko").split("-")[0];
  const code: "ko" | "en" | "ja" | "vi" =
    base === "en" ? "en" : base === "ja" ? "ja" : base === "vi" ? "vi" : "ko";
  const m = META[code];
  document.documentElement.lang = code;
  document.title = m.title;
  setMeta('meta[name="description"]', "content", m.description);
  setMeta('link[rel="manifest"]', "href", m.manifest);
  setMeta('meta[name="apple-mobile-web-app-title"]', "content", m.appleTitle);
  setMeta('meta[property="og:locale"]', "content", OG_LOCALE[code]);
  setMeta('meta[property="og:title"]', "content", m.title);
  setMeta('meta[property="og:description"]', "content", m.description);
  setMeta('meta[name="twitter:title"]', "content", m.title);
  setMeta('meta[name="twitter:description"]', "content", m.description);
};
syncDocument(i18n.language || "ko");

export default i18n;
