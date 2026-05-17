// DEV-only floating panel — slot 페이지 우하단에 마운트되어
// spin_start / coin_drop / big_win_trigger / legendary 를 수동 트리거하고
// 실제 재생 소스(override-mp3 / pack-mp3 / procedural / missing)를 표시한다.
// production 빌드에서는 마운트되지 않는다 (import.meta.env.DEV 가드).
import { useEffect, useState } from "react";
import { SoundManager, getLastPlayed, onLastPlayed, type LastPlayed } from "@/lib/sound/SoundManager";

interface Props {
  slotId: string;
}

type Cue = { label: string; fire: () => void };

export default function SoundTimingPanel({ slotId }: Props) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<LastPlayed | null>(getLastPlayed());

  useEffect(() => onLastPlayed(setLast), []);

  const cues: Cue[] = [
    { label: "spin_start", fire: () => SoundManager.playReelSpin("normal") },
    { label: "coin_drop (reel_stop)", fire: () => SoundManager.playReelStop() },
    { label: "big_win_trigger (×10)", fire: () => SoundManager.playWinTier(100, 10) },
    { label: "huge_win (×50)", fire: () => SoundManager.playWinTier(500, 10) },
    { label: "mega_win (×200)", fire: () => SoundManager.playWinTier(2000, 10) },
    { label: "epic_win (×500)", fire: () => SoundManager.playWinTier(5000, 10) },
  ];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { SoundManager.unlock(); setOpen(true); }}
        className="fixed bottom-3 right-3 z-[200] rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-mono text-white/80 ring-1 ring-white/20 backdrop-blur hover:bg-black/85"
        aria-label="Open sound timing panel"
      >
        🔊 SOUND
      </button>
    );
  }

  const srcColor =
    last?.source === "override-mp3" ? "text-emerald-300"
    : last?.source === "pack-mp3"   ? "text-sky-300"
    : last?.source === "procedural" ? "text-amber-300"
    : "text-rose-300";

  return (
    <div className="fixed bottom-3 right-3 z-[200] w-[280px] rounded-lg bg-black/85 p-3 font-mono text-[11px] text-white/90 ring-1 ring-white/20 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">SOUND · {slotId}</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-1.5 text-white/60 hover:text-white"
          aria-label="Close"
        >×</button>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1">
        {cues.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => { SoundManager.unlock(); c.fire(); }}
            className="rounded bg-white/10 px-2 py-1 text-left hover:bg-white/20 active:scale-[0.98]"
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="rounded bg-white/5 p-2">
        <div className="text-[10px] text-white/50">last played</div>
        {last ? (
          <div className="mt-0.5 space-y-0.5">
            <div>
              <span className="text-white/60">cue:</span> {last.cue}
              <span className="ml-2 text-white/60">ch:</span> {last.channel}
            </div>
            <div>
              <span className="text-white/60">src:</span>{" "}
              <span className={srcColor}>{last.source}</span>
            </div>
            {last.url && (
              <div className="truncate text-white/70" title={last.url}>{last.url}</div>
            )}
          </div>
        ) : (
          <div className="mt-0.5 text-white/50">(none yet — click a cue)</div>
        )}
      </div>

      <div className="mt-2 text-[10px] leading-tight text-white/40">
        Slot 안에서 Spin → spin_start, 마지막 릴 정지 → coin_drop,
        ×10 이상 승리 → big_win_trigger 가 mp3 로 재생되어야 합니다.
      </div>
    </div>
  );
}
