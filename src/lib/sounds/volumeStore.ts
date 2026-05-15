// localStorage volume persistence + cross-tab sync.
// Single source of truth for master / sfx / bgm / muted.
import { Howler } from "howler";
import { SoundManager } from "@/lib/sound/SoundManager";

const KEY = "phonara:sound_volume:v1";

export interface VolumeState {
  master: number; // 0..1
  sfx: number;    // 0..1
  bgm: number;    // 0..1
  muted: boolean;
}

const DEFAULTS: VolumeState = { master: 0.8, sfx: 1.0, bgm: 0.6, muted: false };

const SSR = typeof window === "undefined";

function clamp(n: number) { return Math.max(0, Math.min(1, n)); }

function read(): VolumeState {
  if (SSR) return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      master: typeof p.master === "number" ? clamp(p.master) : DEFAULTS.master,
      sfx: typeof p.sfx === "number" ? clamp(p.sfx) : DEFAULTS.sfx,
      bgm: typeof p.bgm === "number" ? clamp(p.bgm) : DEFAULTS.bgm,
      muted: !!p.muted,
    };
  } catch { return { ...DEFAULTS }; }
}

let state: VolumeState = read();
const listeners = new Set<(s: VolumeState) => void>();

function persist() {
  if (SSR) return;
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* */ }
}

function applyToEngines() {
  if (SSR) return;
  try { Howler.volume(state.master); } catch { /* */ }
  // 기존 SoundManager 채널 볼륨 동기화 (있으면 호출)
  try { SoundManager.setMasterVolume?.(state.master); } catch { /* */ }
  try { SoundManager.setChannelVolume?.("bgm", state.bgm); } catch { /* */ }
  // SFX는 win/reel/scatter/stop 등 다수 채널에 적용
  for (const ch of ["reel", "stop", "win", "bigwin", "scatter", "bonus_trigger", "bonus_loop", "mech", "vo"] as const) {
    try { SoundManager.setChannelVolume?.(ch, state.sfx); } catch { /* */ }
  }
  // mute 동기화는 SoundManager.setMuted가 localStorage(phonara:slot_mute)도 함께 다룸
  try { SoundManager.setMuted(state.muted); } catch { /* */ }
}

function emit() {
  for (const fn of listeners) { try { fn(state); } catch { /* */ } }
}

export const volumeStore = {
  get(): VolumeState { return { ...state }; },
  set(patch: Partial<VolumeState>) {
    state = {
      master: patch.master !== undefined ? clamp(patch.master) : state.master,
      sfx: patch.sfx !== undefined ? clamp(patch.sfx) : state.sfx,
      bgm: patch.bgm !== undefined ? clamp(patch.bgm) : state.bgm,
      muted: patch.muted !== undefined ? !!patch.muted : state.muted,
    };
    persist();
    applyToEngines();
    emit();
  },
  subscribe(fn: (s: VolumeState) => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  /** 외부 페이지/엔진 초기화 시 1회 호출. */
  hydrate() { applyToEngines(); emit(); },
};

// 다른 탭에서 변경 시 동기화
if (!SSR) {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const p = JSON.parse(e.newValue);
      state = {
        master: clamp(p.master ?? DEFAULTS.master),
        sfx: clamp(p.sfx ?? DEFAULTS.sfx),
        bgm: clamp(p.bgm ?? DEFAULTS.bgm),
        muted: !!p.muted,
      };
      applyToEngines();
      emit();
    } catch { /* */ }
  });
  // 초기 적용 (Howler ctx가 lazy라 안전)
  applyToEngines();
}
