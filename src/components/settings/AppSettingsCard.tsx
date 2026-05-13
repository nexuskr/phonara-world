/**
 * AppSettingsCard — 사용자 UI 설정 (Profile 탭)
 * - 동작 최소화 (자동/켜짐/꺼짐)
 * - 라이브 피드 속도 (느림/보통/빠름/끔)
 */
import { useAppSettings } from "@/lib/app-settings";
import { Sparkles, Activity } from "lucide-react";

export default function AppSettingsCard() {
  const [s, set] = useAppSettings();
  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <div>
          <div className="text-sm font-bold">동작 최소화</div>
          <div className="text-[10px] text-muted-foreground">
            화면 흔들림·반복 애니메이션을 줄입니다.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["auto", "on", "off"] as const).map((v) => (
          <button
            key={v}
            onClick={() => set({ reduceMotion: v })}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              s.reduceMotion === v
                ? "bg-primary/15 border-primary text-primary"
                : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
          >
            {v === "auto" ? "자동" : v === "on" ? "켜짐" : "꺼짐"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
        <Activity className="w-4 h-4 text-gold" />
        <div>
          <div className="text-sm font-bold">라이브 피드 속도</div>
          <div className="text-[10px] text-muted-foreground">
            대시보드 활동 스트림 갱신 주기를 조절합니다.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(["slow", "normal", "fast", "off"] as const).map((v) => (
          <button
            key={v}
            onClick={() => set({ tickerSpeed: v })}
            className={`px-2 py-2 rounded-xl text-xs font-bold border transition ${
              s.tickerSpeed === v
                ? "bg-gold/15 border-gold text-gold"
                : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
          >
            {v === "slow" ? "느림" : v === "normal" ? "보통" : v === "fast" ? "빠름" : "끔"}
          </button>
        ))}
      </div>
    </div>
  );
}
