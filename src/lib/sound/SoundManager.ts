// SoundManager — Howler 기반 단일 인스턴스, 레이어드 채널, 모바일 unlock,
// 자산 미존재 시 절차 사운드(slotSound)로 자동 폴백.
// 모든 cue가 자산 없을 때도 들리도록 풀-폴백 라우팅.
import { Howl, Howler } from "howler";
import type { SlotThemeKey, CueKey, MechCue } from "./themes";
import {
  playSlotCue,
  isSlotMuted,
  setSlotMuted,
  unlockSlotAudio,
  startProcBGM,
  stopProcBGM,
  type Cue as ProcCue,
  type SoundPack as ProcPack,
} from "@/lib/slotSound";
import { supabase } from "@/integrations/supabase/client";
import { logSlotAnomaly } from "@/lib/slots/anomaly";

type Channel = "bgm" | "reel" | "stop" | "win" | "bigwin" | "scatter" | "bonus_trigger" | "bonus_loop" | "mech" | "vo";

const CHANNEL_VOLUME: Record<Channel, number> = {
  bgm: 0.35, reel: 0.45, stop: 0.55, win: 0.7, bigwin: 0.85,
  scatter: 0.7, bonus_trigger: 0.9, bonus_loop: 0.4, mech: 0.6, vo: 0.85,
};
// 외부(volumeStore)가 곱하는 게인 — 1.0 = 기본
const channelGain: Record<Channel, number> = {
  bgm: 1, reel: 1, stop: 1, win: 1, bigwin: 1,
  scatter: 1, bonus_trigger: 1, bonus_loop: 1, mech: 1, vo: 1,
};
function effVol(ch: Channel) {
  return Math.max(0, Math.min(1, CHANNEL_VOLUME[ch] * channelGain[ch]));
}

const PROC_PACK: Record<SlotThemeKey, ProcPack> = {
  olympus: "olympus", wizard: "wizard", dragon: "dragon",
  cosmic: "cosmic", neon: "neon", pirate: "pirate", pharaoh: "pharaoh",
  viking: "viking", aztec: "aztec", sakura: "sakura",
};

// CueKey → procedural Cue 매핑 (자산 없을 때 폴백 라우팅)
const CUE_TO_PROC: Partial<Record<CueKey, ProcCue>> = {
  reel_spin: "spin",
  reel_spin_fast: "spin_fast",
  reel_stop: "stop",
  reel_anticipation: "anticipation",
  scatter_hit: "scatter",
  bonus_trigger: "bonus_trigger",
  win_small: "win_small",
  win_big: "win_big",
  win_huge: "win_huge",
  win_mega: "win_mega",
  win_epic: "win_epic",
  vo_bigwin: "vo_bigwin",
  vo_megawin: "vo_megawin",
  vo_epic: "vo_epic",
};

class SoundManagerImpl {
  private theme: SlotThemeKey | null = null;
  private cache = new Map<string, Howl>();
  private bgm: Howl | null = null;
  private bgmIsProc = false;
  private unlocked = false;

  async loadPack(theme: SlotThemeKey) {
    if (this.theme === theme) return;
    this.theme = theme;
    this.cache.clear();
    if (this.bgm) { try { this.bgm.stop(); } catch { /* */ } this.bgm = null; }
    stopProcBGM(0.3);
    this.bgmIsProc = false;
    try {
      const { data } = await supabase.rpc("get_slot_sound_pack", { _theme: theme });
      if (Array.isArray(data)) {
        for (const row of data as { cue: string; url: string }[]) {
          this.cache.set(row.cue, new Howl({ src: [row.url], html5: false, preload: true }));
        }
      }
    } catch {
      // 자산 로딩 실패 — 폴백만 사용
    }
  }

  async unlock() {
    try { await Howler.ctx?.resume?.(); } catch { /* */ }
    await unlockSlotAudio();
    this.unlocked = true;
  }

  isMuted() { return isSlotMuted(); }
  setMuted(m: boolean) {
    setSlotMuted(m);
    Howler.mute(m);
    if (m) {
      if (this.bgm) try { this.bgm.pause(); } catch { /* */ }
      stopProcBGM(0.2);
    } else {
      if (this.bgm && !this.bgm.playing()) try { this.bgm.play(); } catch { /* */ }
      else if (this.theme) this.playBGM({ fadeMs: 250 });
    }
  }

  playBGM(opts: { fadeMs?: number } = {}) {
    if (this.isMuted() || !this.theme) return;
    const sound = this.cache.get("bgm");
    if (sound) {
      this.bgmIsProc = false;
      stopProcBGM(0.3);
      if (this.bgm === sound && sound.playing()) return;
      if (this.bgm) try { this.bgm.fade(this.bgm.volume(), 0, opts.fadeMs ?? 600); } catch { /* */ }
      this.bgm = sound;
      sound.loop(true);
      sound.volume(0);
      sound.play();
      sound.fade(0, effVol("bgm"), opts.fadeMs ?? 800);
      return;
    }
    // 자산 없음 → 절차 BGM
    this.bgmIsProc = true;
    startProcBGM(PROC_PACK[this.theme]);
  }

  stopBGM(fadeMs = 400) {
    if (this.bgm) {
      const b = this.bgm;
      try { b.fade(b.volume(), 0, fadeMs); setTimeout(() => { try { b.stop(); } catch { /* */ } }, fadeMs); } catch { /* */ }
      this.bgm = null;
    }
    if (this.bgmIsProc) {
      stopProcBGM(fadeMs / 1000);
      this.bgmIsProc = false;
    }
  }

  playReelSpin(speed: "normal" | "fast" = "normal") {
    this.play(speed === "fast" ? "reel_spin_fast" : "reel_spin", "reel");
  }
  playReelStop() { this.play("reel_stop", "stop"); }
  playAnticipation() { this.play("reel_anticipation", "scatter"); }
  playScatter() { this.play("scatter_hit", "scatter"); }
  playBonusTrigger() { this.play("bonus_trigger", "bonus_trigger"); }

  /** 베팅 대비 페이아웃 배수에 따라 win tier 자동 선택. */
  playWinTier(amount: number, bet: number) {
    if (bet <= 0 || amount <= 0) return;
    const x = amount / bet;
    let cue: CueKey = "win_small";
    if (x >= 500) cue = "win_epic";
    else if (x >= 200) cue = "win_mega";
    else if (x >= 50) cue = "win_huge";
    else if (x >= 10) cue = "win_big";
    this.play(cue, x >= 50 ? "bigwin" : "win");
    if (x >= 200) this.play("vo_megawin", "vo");
    else if (x >= 50) this.play("vo_bigwin", "vo");
    if (x >= 500) this.play("vo_epic", "vo");
  }

  playMechCue(name: MechCue) { this.play(name as CueKey, "mech"); }

  /** 사운드 테스트 — 현재 테마의 모든 cue를 순차 재생. */
  testAll() {
    if (!this.theme) return;
    const seq: { cue: CueKey; ch: Channel; delay: number }[] = [
      { cue: "reel_spin", ch: "reel", delay: 0 },
      { cue: "reel_stop", ch: "stop", delay: 700 },
      { cue: "reel_anticipation", ch: "scatter", delay: 1000 },
      { cue: "scatter_hit", ch: "scatter", delay: 2600 },
      { cue: "bonus_trigger", ch: "bonus_trigger", delay: 3700 },
      { cue: "win_small", ch: "win", delay: 5200 },
      { cue: "win_big", ch: "win", delay: 6200 },
      { cue: "win_huge", ch: "win", delay: 7400 },
      { cue: "win_mega", ch: "bigwin", delay: 8800 },
      { cue: "win_epic", ch: "bigwin", delay: 10500 },
    ];
    seq.forEach(({ cue, ch, delay }) => setTimeout(() => this.play(cue, ch), delay));
  }

  /** 내부: 자산 없으면 procedural 폴백으로 라우팅. */
  private play(cue: CueKey, channel: Channel) {
    if (this.isMuted()) return;
    const sound = this.cache.get(cue);
    if (sound) {
      try {
        sound.volume(effVol(channel));
        sound.play();
        return;
      } catch (e) {
        logSlotAnomaly("sound_init_failed", null, null, null, { cue, channel, error: String(e) });
      }
    }
    // 풀 폴백 — CUE_TO_PROC에 정의된 cue는 모두 procedural로 들리게
    if (this.theme) {
      const pf = CUE_TO_PROC[cue];
      if (pf) playSlotCue(PROC_PACK[this.theme], pf);
    }
  }

  pauseAll() {
    Howler.volume(0);
    if (this.bgm) try { this.bgm.pause(); } catch { /* */ }
    if (this.bgmIsProc) stopProcBGM(0.2);
  }
  resumeAll() {
    if (this.isMuted()) return;
    Howler.volume(1);
    if (this.bgm && !this.bgm.playing()) try { this.bgm.play(); } catch { /* */ }
    else if (this.bgmIsProc && this.theme) startProcBGM(PROC_PACK[this.theme]);
  }

  /** 마스터 볼륨 (0..1). volumeStore가 단일 소스. */
  setMasterVolume(v: number) {
    const c = Math.max(0, Math.min(1, v));
    try { Howler.volume(c); } catch { /* */ }
    // BGM 재생 중이면 즉시 게인 반영
    if (this.bgm) try { this.bgm.volume(effVol("bgm")); } catch { /* */ }
  }

  /** 채널별 게인 곱 (0..1+). */
  setChannelVolume(channel: Channel, v: number) {
    channelGain[channel] = Math.max(0, Math.min(1, v));
    if (channel === "bgm" && this.bgm) try { this.bgm.volume(effVol("bgm")); } catch { /* */ }
  }
}

export const SoundManager = new SoundManagerImpl();

// visibilitychange — 백그라운드 진입 시 BGM 정지
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) SoundManager.pauseAll();
    else SoundManager.resumeAll();
  });
  // 첫 터치 unlock
  const unlock = () => { SoundManager.unlock(); window.removeEventListener("pointerdown", unlock); };
  window.addEventListener("pointerdown", unlock, { once: true });
}
