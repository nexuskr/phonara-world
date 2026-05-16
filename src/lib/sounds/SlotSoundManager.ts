// Thin facade over the existing SoundManager (src/lib/sound/SoundManager.ts).
// Surface: getInstance / loadCommonSounds / loadSlotSounds / play /
// playWinSound / BGM 제어 / 볼륨 제어 / mute / duckBgm / restoreBgm /
// setReducedMotionMute. Asset 미존재 시 procedural fallback 자동 라우팅.
import { Howl } from "howler";
import { SoundManager } from "@/lib/sound/SoundManager";
import {
  SOUND_PATHS,
  SLOT_ID_TO_THEME,
  SLOT_SOUND_MAP,
  SLOT_ID_TO_SOUND_KEY,
  classifyWinTier,
  type WinTier,
} from "./soundConfig";
import { volumeStore } from "./volumeStore";
import { playSlotCue, type Cue as ProcCue, type SoundPack as ProcPack } from "@/lib/slotSound";
import type { SlotThemeKey } from "@/lib/sound/themes";
import { setVisibleInterval } from "@/lib/util/visible-interval";

const SSR = typeof window === "undefined";

const WIN_TO_PROC: Record<WinTier, ProcCue> = {
  big: "win_big",
  mega: "win_mega",
  epic: "win_huge",
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

type Channel = "sfx" | "voice";
type SlotEntry = {
  key: string;
  howl: Howl;
  loaded: boolean;
  failed: boolean;
  channel: Channel;
};

class SlotSoundManagerImpl {
  private slotId = "";
  private themeKey: SlotThemeKey | null = null;
  private commonLoaded = false;
  private commonHowls = new Map<string, SlotEntry>();
  private slotHowls = new Map<string, SlotEntry>();
  private bgmStarted = false;

  // Ducking 상태 — 다중 호출 시 baseline 보존
  private duckActive = false;
  private duckBaselineBgm = 0.6;
  private duckTween: (() => void) | null = null;

  // reduced-motion mute (voice 채널 한정)
  private reducedMotionMute = false;

  /** 공통 SFX 로드 — 앱 시작 시 1회. */
  loadCommonSounds() {
    if (SSR || this.commonLoaded) return;
    this.commonLoaded = true;
    for (const [key, path] of Object.entries(SOUND_PATHS.common)) {
      this.registerHowl(this.commonHowls, key, path, { channel: "sfx" });
    }
  }

  /** 슬롯 진입 시 — 테마 매칭 + 슬롯 전용 SFX/voice 자산 lazy 로드. */
  async loadSlotSounds(slotId: string) {
    if (SSR) return;
    if (this.slotId === slotId) return;
    this.unloadSlot();
    this.slotId = slotId;
    const theme = SLOT_ID_TO_THEME[slotId] ?? null;
    this.themeKey = theme;
    if (theme) {
      try { await SoundManager.loadPack(theme); } catch { /* */ }
    }

    // 슬롯 BGM (정적 자산 — 실패 시 SoundManager가 procedural BGM으로 폴백)
    const paths = SOUND_PATHS.slot(slotId);
    this.registerHowl(this.slotHowls, "static_bgm", paths.bgm, {
      loop: true,
      channel: "sfx",
    });

    // SLOT_SOUND_MAP — slotId alias 정규화 후 SFX/Voice 자동 register
    const mapKey = SLOT_ID_TO_SOUND_KEY[slotId];
    const entry = mapKey ? SLOT_SOUND_MAP[mapKey] : undefined;
    if (entry) {
      for (const sfx of entry.sfx) {
        this.registerHowl(this.slotHowls, sfx, paths.sfx(sfx), { channel: "sfx" });
      }
      for (const v of entry.voice) {
        this.registerHowl(this.slotHowls, v, paths.voice(v), { channel: "voice" });
      }
    }
  }

  private registerHowl(
    map: Map<string, SlotEntry>,
    key: string,
    src: string,
    opts: { loop?: boolean; channel: Channel },
  ) {
    if (map.has(key)) return;
    const entry: SlotEntry = {
      key,
      howl: null as unknown as Howl,
      loaded: false,
      failed: false,
      channel: opts.channel,
    };
    const howl = new Howl({
      src: [src],
      loop: !!opts.loop,
      preload: true,
      html5: false,
      volume: 1,
      onload: () => { entry.loaded = true; },
      // Silent fallback: 음원 자산 미배포 상태가 정상 운영 가드(public/sounds/** 비어 있음).
      // procedural BGM/SFX 폴백이 자동 라우팅되므로 사용자/모니터링에 404를 노출하지 않는다.
      onloaderror: () => { entry.failed = true; },
      onplayerror: () => { entry.failed = true; },
    });
    entry.howl = howl;
    map.set(key, entry);
  }

  private resolveEntry(key: string) {
    return this.slotHowls.get(key) ?? this.commonHowls.get(key);
  }

  /** 단발 cue 재생. opts.channel 명시 시 reduced-motion voice 가드 적용.
   *  자산 실패/미존재 → procedural 폴백. */
  play(key: string, volumeMultiplier = 1.0, opts?: { channel?: Channel }) {
    if (SSR) return;
    if (this.isMuted()) return;
    const entry = this.resolveEntry(key);
    const channel = opts?.channel ?? entry?.channel ?? "sfx";
    if (channel === "voice" && this.shouldMuteVoice()) return;

    if (entry && entry.loaded && !entry.failed) {
      try {
        const v = volumeStore.get();
        const channelVol = channel === "voice" ? v.voice : v.sfx;
        const base = channelVol * v.master;
        entry.howl.volume(Math.max(0, Math.min(1, base * volumeMultiplier)));
        entry.howl.play();
        return;
      } catch { /* fall through */ }
    }
    const proc = KEY_TO_PROC[key];
    if (proc && this.themeKey) {
      playSlotCue(this.themeKey as ProcPack, proc);
    }
  }

  private shouldMuteVoice() {
    if (!this.reducedMotionMute) return false;
    return volumeStore.get().reducedMotionRespect;
  }

  /** Win-tier 자동 분기. legendary 는 BGM ducking 자동 트리거. */
  playWinSound(tier: WinTier, multiplier = 1.0) {
    const tierKey = ({
      big: "big_win_trigger",
      mega: "mega_win",
      epic: "epic_win",
      legendary: "legendary_win",
    } as const)[tier];
    const vol = tier === "legendary" ? 1.15 : 1.0;
    this.play(tierKey, vol * multiplier);
    if (tier === "legendary") {
      this.duckBgm(-6, 400);
      window.setTimeout(() => this.restoreBgm(400), 2400);
    }
  }

  playWinByMultiplier(multiplier: number) {
    const tier = classifyWinTier(multiplier);
    if (tier) this.playWinSound(tier, 1.0);
  }

  // ===== BGM Ducking =====
  /** targetDb (예: -6) 만큼 BGM 채널 볼륨을 부드럽게 낮춘다. */
  duckBgm(targetDb = -6, rampMs = 400) {
    if (SSR) return;
    const baseline = this.duckActive ? this.duckBaselineBgm : volumeStore.get().bgm;
    if (!this.duckActive) {
      this.duckBaselineBgm = baseline;
      this.duckActive = true;
    }
    const factor = Math.pow(10, targetDb / 20); // -6dB ≈ 0.501
    const target = Math.max(0, Math.min(1, baseline * factor));
    this.tweenBgm(target, rampMs);
  }

  /** 원래 BGM 볼륨으로 복귀. */
  restoreBgm(rampMs = 400) {
    if (SSR || !this.duckActive) return;
    const baseline = this.duckBaselineBgm;
    this.tweenBgm(baseline, rampMs, () => {
      this.duckActive = false;
    });
  }

  private tweenBgm(target: number, rampMs: number, onDone?: () => void) {
    if (SSR) return;
    if (this.duckTween) {
      this.duckTween();
      this.duckTween = null;
    }
    let current = 0;
    try {
      // 현재 적용된 channel volume을 추정하기 어려우므로 baseline에서 시작
      current = volumeStore.get().bgm;
    } catch { current = target; }
    const start = current;
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / Math.max(1, rampMs);
      if (t >= 1) {
        try { SoundManager.setChannelVolume?.("bgm", target); } catch { /* */ }
        if (this.duckTween) this.duckTween();
        this.duckTween = null;
        onDone?.();
        return;
      }
      const v = start + (target - start) * t;
      try { SoundManager.setChannelVolume?.("bgm", v); } catch { /* */ }
    };
    this.duckTween = setVisibleInterval(tick, 24 , { meta: { owner: "SlotSoundManager", category: "cosmetic" } });
  }

  // ===== Reduced-motion mute =====
  /** voice 채널 mute on/off. BaseMaxWinOverlay 가 prefers-reduced-motion 매치 시 호출. */
  setReducedMotionMute(enabled: boolean) {
    this.reducedMotionMute = enabled;
  }

  // ===== BGM 위임 =====
  playBGM() {
    if (SSR || this.isMuted()) return;
    SoundManager.playBGM({ fadeMs: 800 });
    this.bgmStarted = true;
  }
  pauseBGM() { if (!SSR) SoundManager.pauseAll(); }
  resumeBGM() { if (!SSR) SoundManager.resumeAll(); }
  stopBGM() { if (!SSR) SoundManager.stopBGM(600); this.bgmStarted = false; }

  unloadSlot() {
    for (const e of this.slotHowls.values()) {
      try { e.howl.unload(); } catch { /* */ }
    }
    this.slotHowls.clear();
    this.slotId = "";
    this.themeKey = null;
    if (this.duckActive) this.restoreBgm(120);
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

  // Volume / mute
  setMasterVolume(v: number) { volumeStore.set({ master: v }); }
  setSfxVolume(v: number) { volumeStore.set({ sfx: v }); }
  setBgmVolume(v: number) { volumeStore.set({ bgm: v }); }
  setVoiceVolume(v: number) { volumeStore.set({ voice: v }); }
  mute() { volumeStore.set({ muted: true }); }
  unmute() { volumeStore.set({ muted: false }); }
  isMuted() { return volumeStore.get().muted; }
  toggleMute() { this.isMuted() ? this.unmute() : this.mute(); }

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
