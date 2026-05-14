/**
 * App settings — user-controllable UI preferences.
 *
 * Stored in localStorage; broadcast via window event "phonara:app-settings".
 * Hook returns reactive state.
 *
 * Settings:
 *  - reduceMotion: "auto" | "on" | "off"  (auto = honor OS prefers-reduced-motion)
 *  - tickerSpeed:  "slow" | "normal" | "fast" | "off"
 */
import { useEffect, useState } from "react";

export type ReduceMotionPref = "auto" | "on" | "off";
export type TickerSpeed = "slow" | "normal" | "fast" | "off";

export interface AppSettings {
  reduceMotion: ReduceMotionPref;
  tickerSpeed: TickerSpeed;
}

const KEY = "phonara:app-settings/v1";
const EVENT = "phonara:app-settings";

const DEFAULTS: AppSettings = { reduceMotion: "auto", tickerSpeed: "normal" };

function read(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function getAppSettings(): AppSettings {
  return read();
}

export function setAppSettings(patch: Partial<AppSettings>) {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  } catch {
    /* swallow */
  }
}

export function useAppSettings(): [AppSettings, (p: Partial<AppSettings>) => void] {
  const [s, setS] = useState<AppSettings>(() => read());
  useEffect(() => {
    const onEvt = (e: Event) => setS((e as CustomEvent<AppSettings>).detail ?? read());
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setS(read()); };
    window.addEventListener(EVENT, onEvt);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onEvt);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return [s, setAppSettings];
}

/** Heuristic: low-end device or save-data network → auto-reduce. */
function shouldAutoReduceForDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    const conn: any = (navigator as any).connection;
    if (conn?.saveData) return true;
    const et: string | undefined = conn?.effectiveType;
    if (et && (et === "slow-2g" || et === "2g" || et === "3g")) return true;
    const mem: number | undefined = (navigator as any).deviceMemory;
    if (typeof mem === "number" && mem > 0 && mem < 4) return true;
  } catch { /* noop */ }
  return false;
}

/** True when motion should be reduced (user pref OR OS pref OR low-end device). */
export function useReducedMotionPref(): boolean {
  const [s] = useAppSettings();
  const [osReduce, setOsReduce] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; } catch { return false; }
  });
  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const fn = (e: MediaQueryListEvent) => setOsReduce(e.matches);
      mq.addEventListener?.("change", fn);
      return () => mq.removeEventListener?.("change", fn);
    } catch {
      return;
    }
  }, []);
  if (s.reduceMotion === "on") return true;
  if (s.reduceMotion === "off") return false;
  return osReduce || shouldAutoReduceForDevice();
}

/** Apply reduce-motion setting to <html> as a class so CSS can react. */
export function applyMotionClassFromSettings() {
  try {
    const s = read();
    const reduce =
      s.reduceMotion === "on" ||
      (s.reduceMotion === "auto" &&
        (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
          shouldAutoReduceForDevice()));
    document.documentElement.classList.toggle("reduce-motion", !!reduce);
  } catch {}
}

/** Install a listener so the html class auto-syncs whenever settings change. */
export function watchMotionClass() {
  if (typeof window === "undefined") return;
  applyMotionClassFromSettings();
  window.addEventListener(EVENT, applyMotionClassFromSettings);
  try {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener?.("change", applyMotionClassFromSettings);
  } catch {}
}

/** Map ticker speed preset → [minMs, maxMs] interval window (or null = paused). */
export function tickerIntervalFor(speed: TickerSpeed): [number, number] | null {
  switch (speed) {
    case "off": return null;
    case "slow": return [3500, 6000];
    case "fast": return [500, 1200];
    case "normal":
    default: return [1200, 2400];
  }
}
