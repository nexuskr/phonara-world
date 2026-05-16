import { useEffect, useState } from "react";
import { Settings2, X } from "lucide-react";
import { isHapticsEnabled, setHapticsEnabled } from "@/lib/haptics";

const RM_KEY = "phonara:crash_reduced_motion:v1";
const MUTE_KEY = "phonara:crash_mute:v1";
const LOW_KEY = "phonara:crash_low_end:v1";

function readBool(key: string, def = false) {
  try { const v = localStorage.getItem(key); return v === null ? def : v === "1"; } catch { return def; }
}
function writeBool(key: string, v: boolean) {
  try { localStorage.setItem(key, v ? "1" : "0"); } catch { /* */ }
  try { window.dispatchEvent(new CustomEvent("phonara:crash-prefs")); } catch { /* */ }
}

export function getCrashPrefs() {
  return {
    reducedMotion: readBool(RM_KEY, false),
    muted: readBool(MUTE_KEY, false),
    lowEnd: readBool(LOW_KEY, false),
    haptics: isHapticsEnabled(),
  };
}

export default function CrashSettingsSheet() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(getCrashPrefs);

  useEffect(() => {
    const sync = () => setPrefs(getCrashPrefs());
    window.addEventListener("phonara:crash-prefs", sync);
    return () => window.removeEventListener("phonara:crash-prefs", sync);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-11 h-11 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition"
        aria-label="Crash 설정"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-sm rounded-t-3xl md:rounded-3xl bg-card border-t md:border border-border/60 p-5 space-y-3 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Crash 설정</h3>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-lg hover:bg-background/40 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <Toggle
              label="진동(햅틱)"
              hint="베팅·캐시아웃 시 가볍게 진동해요"
              value={prefs.haptics}
              onChange={(v) => { setHapticsEnabled(v); setPrefs(getCrashPrefs()); }}
            />
            <Toggle
              label="모션 줄이기"
              hint="화면 흔들림·파티클을 끕니다"
              value={prefs.reducedMotion}
              onChange={(v) => { writeBool(RM_KEY, v); setPrefs(getCrashPrefs()); }}
            />
            <Toggle
              label="사운드 끄기"
              hint="효과음을 음소거해요"
              value={prefs.muted}
              onChange={(v) => { writeBool(MUTE_KEY, v); setPrefs(getCrashPrefs()); }}
            />
            <Toggle
              label="저사양 모드"
              hint="화면 효과를 최소화해 끊김을 줄여요"
              value={prefs.lowEnd}
              onChange={(v) => { writeBool(LOW_KEY, v); setPrefs(getCrashPrefs()); }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full min-h-14 flex items-center justify-between gap-3 rounded-2xl bg-background/40 border border-border/40 px-4 py-3 active:scale-[0.99] transition"
    >
      <span className="text-left">
        <span className="block text-sm font-bold text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <span
        className={`relative w-12 h-7 rounded-full transition ${value ? "bg-[hsl(var(--gold))]" : "bg-muted"}`}
        aria-pressed={value}
        role="switch"
      >
        <span
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition ${value ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
