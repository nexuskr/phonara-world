import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { notify } from "@/lib/notify";
import { PROMPT_MATRIX, type SlotThemeKey } from "@/lib/sound/themes";

const THEMES: SlotThemeKey[] = [
  "olympus", "wizard", "dragon", "cosmic", "neon", "pirate", "pharaoh", "viking", "aztec", "sakura",
];

type AssetRow = { theme: string; cue: string; url: string; version: number };

export function SlotSfxAdmin() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await (supabase as any).from("slot_sound_assets").select("theme,cue,url,version");
    setAssets((data ?? []) as AssetRow[]);
  };
  useEffect(() => { load(); }, []);

  const generate = async (theme: SlotThemeKey) => {
    setBusy(theme);
    const prompts = PROMPT_MATRIX[theme] ?? {};
    const cues = Object.keys(prompts);
    setProgress((p) => ({ ...p, [theme]: `0 / ${cues.length}` }));
    try {
      // Chunk by 4 to keep edge time within limits
      const chunkSize = 4;
      let done = 0;
      for (let i = 0; i < cues.length; i += chunkSize) {
        const slice = cues.slice(i, i + chunkSize);
        const { data, error } = await supabase.functions.invoke("generate-slot-sfx", {
          body: { theme, cues: slice, prompts },
        });
        if (error) throw error;
        done += slice.length;
        setProgress((p) => ({ ...p, [theme]: `${done} / ${cues.length}` }));
      }
      notify.success(`${theme} 사운드 팩 생성 완료`);
      await load();
    } catch (e) {
      notify.error(`생성 실패: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">슬롯 사운드 자산 (ElevenLabs)</h2>
        <p className="text-xs text-muted-foreground">
          테마별 cue를 ElevenLabs로 생성해 Storage `slot-sfx/{theme}/{cue}.mp3` 에 업로드합니다.
          미생성 자산은 클라이언트에서 자동으로 절차 사운드로 폴백됩니다.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {THEMES.map((theme) => {
          const total = Object.keys(PROMPT_MATRIX[theme] ?? {}).length;
          const have = assets.filter((a) => a.theme === theme).length;
          return (
            <div key={theme} className="border border-border rounded-md p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{theme}</div>
                <div className="text-xs text-muted-foreground">
                  {have} / {total} 자산 {progress[theme] ? `· ${progress[theme]}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => generate(theme)}
              >
                {busy === theme ? "생성 중…" : have === total ? "재생성" : "생성"}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default SlotSfxAdmin;
