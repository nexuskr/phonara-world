// Thin facade over the existing SoundManager (src/lib/sound/SoundManager.ts).
// 요청된 API 표면 — getInstance / loadCommonSounds / loadSlotSounds / play /
// playWinSound / BGM 제어 / 볼륨 제어 / mute — 를 제공하면서, 자산이 없으면
// 자동으로 procedural fallback 으로 라우팅한다.
import { Howl } from "howler";
import { SoundManager } from "@/lib/sound/SoundManager";
import {
  SOUND_PATHS,
  SLOT_ID_TO_THEME,
  classifyWinTier,
  type WinTier,
} from "./soundConfig";
import { volumeStore } from "./volumeStore";
import { playSlotCue, type Cue as ProcCue, type SoundPack as ProcPack } from "@/lib/slotSound";
import type { SlotThemeKey } from "@/lib/sound/themes";

const SSR = typeof window === "undefined";

const WIN_TO_PROC: Record<WinTier, ProcCue> = {
  big: "win_big",
  mega: "win_mega",
  epic: "win_huge", // procedural에는 epic 컷이 win_epic, 1단계 위가 mega → 의도적 매핑
  legendary: "win_epic",
};

const KEY_TO_PROC: Record<string, ProcCue | undefined> = {
  spin_start: "spin",
  spin_fast: "spin_fast",
  reel_stop: "stop",
  scatter_hit: "scatter",
  bonus_trigger: "bonus_trigger",
  big_win_trigger: "win_big",
  mega_win: "win_mega",
  epic_win: "win_huge",
  legendary_win: "win_epic",
};

type SlotEntry = { key: string; howl: Howl; loaded: boolean; failed: boolean };

class SlotSoundManagerImpl {
  private slotId = "";
  private themeKey: SlotThemeKey | null = null;
  private commonLoaded = false;
  private commonHowls = new Map<string, SlotEntry>();
  private slotHowls = new Map<string, SlotEntry>();
  private bgmStarted = false;

  /** 공통 SFX 로드 — 첫 슬롯 진입 시 1회. */
  loadCommonSounds() {
    if (SSR || this.commonLoaded) return;
    this.commonLoaded = true;
    for (const [key, path] of Object.entries(SOUND_PATHS.common)) {
      this.registerHowl(this.commonHowls, key, path);
    }
  }

  /** 슬롯 진입 시 — 테마 매칭 + 슬롯 전용 자산 로드 + 기존 SoundManager 위임. */
  async loadSlotSounds(slotId: string) {
    if (SSR) return;
    if (this.slotId === slotId) return;
    this.unloadSlot();
    this.slotId = slotId;
    const theme = SLOT_ID_TO_THEME[slotId] ?? null;
    this.themeKey = theme;
    if (theme) {
      // 기존 엔진: Supabase RPC pack + procedural fallback 자동
      try { await SoundManager.loadPack(theme); } catch { /* */ }
    }
    // 슬롯별 BGM (정적 자산 시도 — 실패 시 SoundManager가 procedural BGM으로 폴백)
    const paths = SOUND_PATHS.slot(slotId);
    this.registerHowl(this.slotHowls, "static_bgm", paths.bgm, { loop: true });
  }

  private registerHowl(
    map: Map<string, SlotEntry>,
    key: string,
    src: string,
    opts: { loop?: boolean } = {},
  ) {
    if (map.has(key)) return;
    const entry: SlotEntry = { key, howl: null as unknown as Howl, loaded: false, failed: false };
    const howl = new Howl({
      src: [src],
      loop: !!opts.loop,
      preload: true,
      html5: false,
      volume: 1,
      onload: () => { entry.loaded = true; },
      onloaderror: () => { entry.failed = true; },
      onplayerror: () => { entry.failed = true; },
    });
    entry.howl = howl;
    map.set(key, entry);
  }

  /** 단발 cue 재생. 자산 실패/미존재 → procedural 폴백. */
  play(key: string, volumeMultiplier = 1.0) {
    if (SSR) return;
    if (this.isMuted()) return;
    const entry = this.slotHowls.get(key) ?? this.commonHowls.get(key);
    if (entry && entry.loaded && !entry.failed) {
      try {
        const base = volumeStore.get().sfx * volumeStore.get().master;
        entry.howl.volume(Math.max(0, Math.min(1, base * volumeMultiplier)));
        entry.howl.play();
        return;
      } catch { /* fall through */ }
    }
    // Procedural fallback
    const proc = KEY_TO_PROC[key];
    if (proc && this.themeKey) {
      playSlotCue(this.themeKey as ProcPack, proc);
    }
  }

  /** Win-tier 자동 분기. */
  playWinSound(tier: WinTier, multiplier = 1.0) {
    const tierKey = ({ big: "big_win_trigger", mega: "mega_win", epic: "epic_win", legendary: "legendary_win" } as const)[tier];
    const vol = tier === "legendary" ? 1.15 : 1.0;
    this.play(tierKey, vol * multiplier);
  }

  /** 멀티플라이어 입력으로 자동 tier 분류 + 재생 (편의 메서드). */
  playWinByMultiplier(multiplier: number) {
    const tier = classifyWinTier(multiplier);
    if (tier) this.playWinSound(tier, 1.0);
  }

  // BGM은 기존 SoundManager에 위임 — 자산 없으면 procedural BGM 자동 시작.
  playBGM() {
    if (SSR || this.isMuted()) return;
    SoundManager.playBGM({ fadeMs: 800 });
    this.bgmStarted = true;
  }
  pauseBGM() { if (!SSR) SoundManager.pauseAll(); }
  resumeBGM() { if (!SSR) SoundManager.resumeAll(); }
  stopBGM() { if (!SSR) SoundManager.stopBGM(600); this.bgmStarted = false; }

  /** 슬롯 전환 — 슬롯 전용 자산만 unload, common 캐시 유지. */
  unloadSlot() {
    for (const e of this.slotHowls.values()) {
      try { e.howl.unload(); } catch { /* */ }
    }
    this.slotHowls.clear();
    this.slotId = "";
    this.themeKey = null;
  }

  unloadAll() {
    this.stopBGM();
    for (const e of this.slotHowls.values()) { try { e.howl.unload(); } catch { /* */ } }
    for (const e of this.commonHowls.values()) { try { e.howl.unload(); } catch { /* */ } }
    this.slotHowls.clear();
    this.commonHowls.clear();
    this.commonLoaded = false;
    this.slotId = "";
    this.themeKey = null;
  }

  // Volume / mute — single source = volumeStore
  setMasterVolume(v: number) { volumeStore.set({ master: v }); }
  setSfxVolume(v: number) { volumeStore.set({ sfx: v }); }
  setBgmVolume(v: number) { volumeStore.set({ bgm: v }); }
  mute() { volumeStore.set({ muted: true }); }
  unmute() { volumeStore.set({ muted: false }); }
  isMuted() { return volumeStore.get().muted; }
  toggleMute() { this.isMuted() ? this.unmute() : this.mute(); }

  /** 첫 사용자 제스처 — Web Audio unlock (기존 엔진 위임). */
  unlock() { if (!SSR) SoundManager.unlock(); }
}

let _instance: SlotSoundManagerImpl | null = null;

export class SlotSoundManager {
  static getInstance(): SlotSoundManagerImpl {
    if (!_instance) _instance = new SlotSoundManagerImpl();
    return _instance;
  }
}

export const soundManager = SlotSoundManager.getInstance();
export type { WinTier };
