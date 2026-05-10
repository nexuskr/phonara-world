/**
 * Phase 10 — Reviewer Mode
 *
 * Hides finance/gambling-style features (Arena, Jackpot, Packages, Deposit/Withdraw, Recovery Bonus)
 * for app store reviewers so they see a clean, safe content-only build.
 *
 * Activated by any of:
 *  - URL query `?reviewer=1`  (sticky — persists to localStorage)
 *  - localStorage key `phonara_reviewer_mode` = "1"
 *  - Build-time env `VITE_REVIEWER_MODE` = "1"
 */
import { useEffect, useState } from "react";

const LS_KEY = "phonara_reviewer_mode";

function readEnvFlag() {
  try {
    // @ts-expect-error vite env
    return import.meta?.env?.VITE_REVIEWER_MODE === "1";
  } catch {
    return false;
  }
}

function readQueryFlag() {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(window.location.search);
  if (p.get("reviewer") === "1") {
    try { localStorage.setItem(LS_KEY, "1"); } catch {}
    return true;
  }
  if (p.get("reviewer") === "0") {
    try { localStorage.removeItem(LS_KEY); } catch {}
    return false;
  }
  return false;
}

function readLocalFlag() {
  try { return localStorage.getItem(LS_KEY) === "1"; } catch { return false; }
}

export function isReviewerMode(): boolean {
  return readEnvFlag() || readQueryFlag() || readLocalFlag();
}

export function setReviewerMode(on: boolean) {
  try {
    if (on) localStorage.setItem(LS_KEY, "1");
    else localStorage.removeItem(LS_KEY);
  } catch {}
  window.dispatchEvent(new Event("phonara:reviewer-mode-change"));
}

export function useReviewerMode(): boolean {
  const [on, setOn] = useState<boolean>(() => isReviewerMode());
  useEffect(() => {
    const handler = () => setOn(isReviewerMode());
    window.addEventListener("phonara:reviewer-mode-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("phonara:reviewer-mode-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return on;
}
