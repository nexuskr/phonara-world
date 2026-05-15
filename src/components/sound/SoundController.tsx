// Floating sound controller — master / sfx / bgm slider + mute toggle.
// CasinoLayout 같은 곳에 1줄로 마운트.
import { useEffect, useState } from "react";
import { Volume2, VolumeX, Music2, Sparkles, Sliders } from "lucide-react";
import { soundManager } from "@/lib/sounds/SlotSoundManager";
import { volumeStore, type VolumeState } from "@/lib/sounds/volumeStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

function pct(v: number) { return Math.round(v * 100); }

export default function SoundController() {
  const [vol, setVol] = useState<VolumeState>(volumeStore.get());

  useEffect(() => volumeStore.subscribe(setVol), []);

  const muted = vol.muted;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={muted ? "사운드 켜기" : "사운드 설정"}
          className="fixed top-3 right-3 z-50 h-9 w-9 rounded-full border-border/50 bg-card/80 backdrop-blur"
        >
          {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-foreground" />}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[360px] bg-card text-foreground">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sliders className="h-4 w-4" /> 사운드 설정
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">음소거</span>
            <Button
              size="sm"
              variant={muted ? "default" : "outline"}
              onClick={() => soundManager.toggleMute()}
              className="h-8"
            >
              {muted ? <><VolumeX className="h-3.5 w-3.5 mr-1" /> ON</> : <><Volume2 className="h-3.5 w-3.5 mr-1" /> OFF</>}
            </Button>
          </div>

          <VolumeRow
            icon={<Volume2 className="h-3.5 w-3.5" />}
            label="마스터"
            value={vol.master}
            onChange={(v) => soundManager.setMasterVolume(v)}
            disabled={muted}
          />
          <VolumeRow
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="효과음 (SFX)"
            value={vol.sfx}
            onChange={(v) => soundManager.setSfxVolume(v)}
            disabled={muted}
          />
          <VolumeRow
            icon={<Music2 className="h-3.5 w-3.5" />}
            label="배경음 (BGM)"
            value={vol.bgm}
            onChange={(v) => soundManager.setBgmVolume(v)}
            disabled={muted}
          />

          <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
            설정은 이 기기에 자동 저장되며 다른 탭과도 동기화됩니다.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VolumeRow({
  icon, label, value, onChange, disabled,
}: {
  icon: React.ReactNode; label: string; value: number;
  onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-foreground flex items-center gap-1.5">{icon} {label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{pct(value)}%</span>
      </div>
      <Slider
        value={[Math.round(value * 100)]}
        min={0}
        max={100}
        step={1}
        onValueChange={(arr) => onChange((arr[0] ?? 0) / 100)}
      />
    </div>
  );
}
