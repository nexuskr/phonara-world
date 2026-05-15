import { useEffect, useState } from "react";
import type { DisplayCurrency } from "@/lib/displayCurrency";

const STORAGE_KEY = "phonara:currency_pref:v1";

function read(): DisplayCurrency {
  if (typeof window === "undefined") return "KRW";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "KRW" || v === "USDT" || v === "PHON") return v;
  // Default: ko locale → KRW, else USDT
  const lang = (navigator.language || "ko").split("-")[0];
  return lang === "ko" ? "KRW" : "USDT";
}

const listeners = new Set<(v: DisplayCurrency) => void>();

export function useCurrencyPref(): [DisplayCurrency, (v: DisplayCurrency) => void] {
  const [pref, setPref] = useState<DisplayCurrency>(read);

  useEffect(() => {
    const fn = (v: DisplayCurrency) => setPref(v);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const update = (v: DisplayCurrency) => {
    try { window.localStorage.setItem(STORAGE_KEY, v); } catch {}
    listeners.forEach((fn) => fn(v));
  };

  return [pref, update];
}
