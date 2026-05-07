import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { track } from "@/lib/analytics";

const LANGS = [
  { code: "ko", flag: "🇰🇷", name: "한국어" },
  { code: "en", flag: "🇺🇸", name: "English" },
] as const;

export default function LanguageSwitcher({
  variant = "default",
}: {
  variant?: "default" | "auth";
}) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = (i18n.language || "ko").split("-")[0];
  const cur = LANGS.find((l) => l.code === current) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full glass border border-primary/20 hover:border-primary/50 transition press ${
          variant === "auth" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1.5 text-xs"
        }`}
        aria-label="Language"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="font-bold text-foreground/90 tracking-wider">
          {cur.code.toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl glass-strong border border-primary/30 shadow-2xl overflow-hidden z-50 animate-liquid-in">
          {LANGS.map((l) => {
            const active = l.code === current;
            return (
              <button
                key={l.code}
                onClick={() => {
                  i18n.changeLanguage(l.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span className="flex-1 font-semibold">{l.name}</span>
                {active && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
