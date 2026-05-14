import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2, Lock, Gift } from "lucide-react";
import { LoadingList } from "@/components/ui/loading-state";

type StageRow = {
  stage_no: number;
  title: string;
  requirement_kind: string;
  requirement_value: number;
  reward_phon: number;
  reward_crown: number;
  claimed: boolean;
  claimed_at: string | null;
};

export default function JourneyClaimPanel() {
  const user = useRequireAuth();
  const [rows, setRows] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_my_journey_claims");
    if (Array.isArray(data)) setRows(data as StageRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const claim = async (stage_no: number) => {
    setBusy(stage_no);
    const { data, error } = await supabase.rpc("claim_journey_stage", { _stage_no: stage_no });
    setBusy(null);
    if (error) {
      const msg = error.message?.includes("requirement_not_met") ? "조건 미달" : error.message;
      notify.error("수령 실패", { description: msg });
      return;
    }
    notify.success(`🎁 단계 ${stage_no} 보상 수령`, {
      description: `+${(data as any)?.phon ?? 0} PHON · +${(data as any)?.crown ?? 0} Crown`,
    });
    void load();
  };

  if (!user) return null;
  if (loading) return <LoadingList rows={6} />;

  return (
    <section aria-label="Journey Claims" className="rounded-3xl border border-primary/30 bg-card/40 backdrop-blur-md p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-4 h-4 text-primary" />
        <span className="text-[10px] tracking-[0.3em] font-black text-primary/90">100-STAGE REWARD</span>
        <span className="ml-auto text-xs text-muted-foreground">{rows.filter(r => r.claimed).length}/{rows.length} 수령</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((r) => (
          <div
            key={r.stage_no}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              r.claimed ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 bg-background/30"
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-imperial flex items-center justify-center shrink-0 text-xs font-black text-primary-foreground">
              {r.stage_no}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{r.title}</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                +{Number(r.reward_phon).toLocaleString()} PHON · +{r.reward_crown} <Crown className="inline w-3 h-3 -mt-0.5" />
              </div>
            </div>
            {r.claimed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Button size="sm" disabled={busy === r.stage_no} onClick={() => claim(r.stage_no)}>
                {busy === r.stage_no ? "..." : "수령"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
