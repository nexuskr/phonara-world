/**
 * Critical anomaly siren — admin-only.
 * Subscribes to anomaly_events INSERTs; plays a short WebAudio beep
 * when severity is critical/high. Respects per-device mute (localStorage).
 *
 * No asset files: uses an OscillatorNode so it works offline.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const MUTE_KEY = "admin_siren_muted_v1";
const PUSH_KEY = "admin_push_enabled_v1";

function readPush(): boolean {
  try { return localStorage.getItem(PUSH_KEY) === "1"; } catch { return false; }
}

async function ensurePushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

function fireBrowserNotify(title: string, body: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "admin-anomaly",
      requireInteraction: false,
      silent: false,
    });
    n.onclick = () => {
      try { window.focus(); } catch { /* */ }
      try { window.location.href = "/admin/ops/errors"; } catch { /* */ }
      n.close();
    };
    setTimeout(() => { try { n.close(); } catch { /* */ } }, 8000);
  } catch { /* */ }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useAdminSiren(enabled: boolean) {
  const [muted, setMutedState] = useState<boolean>(() => readMuted());
  const [pushEnabled, setPushEnabledState] = useState<boolean>(() => readPush());
  const ctxRef = useRef<AudioContext | null>(null);
  const [lastFiredAt, setLastFiredAt] = useState<number | null>(null);

  const setMuted = useCallback((v: boolean) => {
    setMutedState(v);
    try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* */ }
  }, []);

  const setPushEnabled = useCallback(async (v: boolean) => {
    if (v) {
      const ok = await ensurePushPermission();
      if (!ok) { setPushEnabledState(false); return; }
    }
    setPushEnabledState(v);
    try { localStorage.setItem(PUSH_KEY, v ? "1" : "0"); } catch { /* */ }
  }, []);

  const beep = useCallback(() => {
    if (muted) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      const ctx = ctxRef.current;
      const now = ctx.currentTime;
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.18);
      });
      setLastFiredAt(Date.now());
    } catch { /* */ }
  }, [muted]);

  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel("admin:siren")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "anomaly_events" },
        (payload) => {
          const row = payload.new as { severity?: string; rule?: string; user_id?: string };
          const sev = (row?.severity ?? "").toLowerCase();
          if (sev === "critical" || sev === "high") {
            beep();
            if (pushEnabled && (document.hidden || !document.hasFocus())) {
              fireBrowserNotify(
                `🚨 ${sev.toUpperCase()} 이상감지`,
                `규칙: ${row?.rule ?? "anomaly"} · 클릭하여 처리`,
              );
            }
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enabled, beep, pushEnabled]);

  return { muted, setMuted, pushEnabled, setPushEnabled, lastFiredAt, testBeep: beep };
}
