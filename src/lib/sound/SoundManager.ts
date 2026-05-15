// SoundManager — Howler 기반 단일 인스턴스, 레이어드 채널, 모바일 unlock,
// 자산 미존재 시 절차 사운드(slotSound)로 자동 폴백.
import { Howl, Howler } from "howler";
import type { SlotThemeKey, CueKey, MechCue } from "./themes";
import { playSlotCue, isSlotMuted, setSlotMuted, unlockSlotAudio } from "@/lib/slotSound";
import { supabase } from "@/integrations/supabase/client";
import { logSlotAnomaly } from "@/lib/slots/anomaly";

type Channel = "bgm" | "reel" | "stop" | "win" | "bigwin" | "scatter" | "bonus_trigger" | "bonus_loop" | "mech" | "vo";

const CHANNEL_VOLUME: Record<Channel, number> = {
  bgm: 0.35, reel: 0.45, stop: 0.55, win: 0.7, bigwin: 0.85,
  scatter: 0.7, bonus_trigger: 0.9, bonus_loop: 0.4, mech: 0.6, vo: 0.85,
};

const PROC_FALLBACK: Partial<Record<SlotThemeKey, "olympus" | "wizard" | "dragon" | "cosmic" | "neon" | "pirate" | "pharaoh" | "viking" | "aztec" | "sakura">> = {
  olympus: "olympus", wizard: "wizard", dragon: "dragon",
  cosmic: "cosmic", neon: "neon", pirate: "pirate", pharaoh: "pharaoh",
  viking: "viking", aztec: "aztec", sakura: "sakura",
};

class SoundManagerImpl {
  private theme: SlotThemeKey | null = null;
  private cache = new Map<string, Howl>();
  private bgm: Howl | null = null;
  private unlocked = false;

  async loadPack(theme: SlotThemeKey) {
    if (this.theme === theme) return;
    this.theme = theme;
    this.cache.clear();
    if (this.bgm) { try { this.bgm.stop(); } catch {} this.bgm = null; }
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
    if (this.unlocked) return;
    this.unlocked = true;
    try { await Howler.ctx?.resume?.(); } catch {}
    await unlockSlotAudio();
  }

  isMuted() { return isSlotMuted(); }
  setMuted(m: boolean) {
    setSlotMuted(m);
    Howler.mute(m);
    if (m && this.bgm) this.bgm.pause();
    else if (!m && this.bgm && !this.bgm.playing()) this.bgm.play();
  }

  playBGM(opts: { fadeMs?: number } = {}) {
    if (this.isMuted() || !this.theme) return;
    const sound = this.cache.get("bgm");
    if (!sound) return;
    if (this.bgm === sound && sound.playing()) return;
    if (this.bgm) try { this.bgm.fade(this.bgm.volume(), 0, opts.fadeMs ?? 600); } catch {}
    this.bgm = sound;
    sound.loop(true);
    sound.volume(0);
    sound.play();
    sound.fade(0, CHANNEL_VOLUME.bgm, opts.fadeMs ?? 800);
  }

  stopBGM(fadeMs = 400) {
    if (!this.bgm) return;
    const b = this.bgm;
    try { b.fade(b.volume(), 0, fadeMs); setTimeout(() => b.stop(), fadeMs); } catch {}
    this.bgm = null;
  }

  playReelSpin(speed: "normal" | "fast" = "normal") {
    this.play(speed === "fast" ? "reel_spin_fast" : "reel_spin", "reel", "spin");
  }
  playReelStop() { this.play("reel_stop", "stop", "stop"); }
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
    this.play(cue, x >= 50 ? "bigwin" : "win", "win");
    if (x >= 200) this.play("vo_megawin", "vo");
    else if (x >= 50) this.play("vo_bigwin", "vo");
    if (x >= 500) this.play("vo_epic", "vo");
  }

  playMechCue(name: MechCue) { this.play(name as CueKey, "mech"); }

  /** 내부: 자산 없으면 절차 폴백 cue로 재맵핑. */
  private play(cue: CueKey, channel: Channel, procFallback?: "spin" | "stop" | "win" | "bigwin") {
    if (this.isMuted()) return;
    const sound = this.cache.get(cue);
    if (sound) {
      try {
        sound.volume(CHANNEL_VOLUME[channel]);
        sound.play();
        return;
      } catch (e) {
        logSlotAnomaly("sound_init_failed", null, null, null, { cue, channel, error: String(e) });
      }
    }
    // 폴백
    if (procFallback && this.theme) {
      const pf = PROC_FALLBACK[this.theme];
      if (pf) playSlotCue(pf, procFallback);
    }
  }

  pauseAll() { Howler.volume(0); if (this.bgm) this.bgm.pause(); }
  resumeAll() { Howler.volume(1); if (this.bgm && !this.isMuted()) this.bgm.play(); }
}

export const SoundManager = new SoundManagerImpl();

// visibilitychange — 백그라운드 진입 시 BGM 정지
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) SoundManager.pauseAll();
    else SoundManager.resumeAll();
  });
  // prefers-reduced-motion / 첫 터치 unlock
  const unlock = () => { SoundManager.unlock(); window.removeEventListener("pointerdown", unlock); };
  window.addEventListener("pointerdown", unlock, { once: true });
}
