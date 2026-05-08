import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useDB, formatKRW } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Crown, Gift, Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LuxButton, Money } from "@/components/ui/lux";

type Reward = { id: string; level: number; free_reward: any; premium_reward: any };
type Season = { id: string; name: string; starts_at: string; ends_at: string; max_level: number; premium_price: number };
type Progress = { xp: number; level: number; premium: boolean; free_claimed: number[]; premium_claimed: number[]; next_level_xp: number };

export default function SeasonPass() {
  const [db] = useDB();
  const { t } = useTranslation("seasonPass");
  const [season, setSeason] = useState<Season | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);

  async function load() {
    const { data: ov } = await supabase.rpc("get_season_overview" as any);
    const o = ov as any;
    setSeason(o?.season ?? null);
    setProgress(o?.progress ?? null);
    if (o?.season?.id) {
      const { data } = await supabase
        .from("season_pass_rewards" as any)
        .select("*")
        .eq("season_id", o.season.id)
        .order("level");
      setRewards((data as any) ?? []);
    }
  }
  useEffect(() => { load(); }, [db.user]);

  async function claim(level: number, track: "free" | "premium") {
    const { data, error } = await supabase.rpc("claim_season_reward" as any, { _level: level, _track: track });
    if (error) return toast({ title: t("claimFail"), description: error.message, variant: "destructive" });
    const r = data as any;
    toast({
      title: t("claimDone"),
      description: r.credit ? formatKRW(r.credit) : (r.badge ? t("badgeEarned", { name: r.badge }) : t("done")),
    });
    load();
  }

  async function buyPass() {
    const { error } = await supabase.rpc("purchase_season_pass" as any);
    if (error) return toast({ title: t("buyFail"), description: error.message, variant: "destructive" });
    toast({ title: t("buyDone") });
    load();
  }

  const xpPct = progress && progress.next_level_xp ? Math.min(100, Math.round((progress.xp / progress.next_level_xp) * 100)) : 0;
  const daysLeft = season ? Math.max(0, Math.ceil((new Date(season.ends_at).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <Layout>
      <div className="space-y-6 pb-24">
        <header className="rounded-3xl bg-gradient-to-br from-fuchsia-500/15 via-background to-background border border-fuchsia-500/20 p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 opacity-20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-fuchsia-400" />
                  <h1 className="font-imperial text-2xl font-black tracking-tight break-keep">{season?.name ?? t("title")}</h1>
                </div>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">{t("daysLeft", { n: daysLeft })}</p>
              </div>
              {progress && !progress.premium && (
                <LuxButton size="md" variant="primary" onClick={buyPass} className="!bg-gradient-to-r !from-fuchsia-500 !to-violet-600 !text-white shadow-lg shadow-fuchsia-500/40">
                  <Crown size={14} /> {t("activatePremium")} {season ? <span className="tabular-nums">({formatKRW(season.premium_price)})</span> : null}
                </LuxButton>
              )}
              {progress?.premium && (
                <span className="px-4 min-h-[44px] inline-flex items-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-bold text-xs">
                  {t("premiumActive")}
                </span>
              )}
            </div>
            {progress && (
              <div className="mt-5">
                <div className="flex items-baseline justify-between text-xs mb-2">
                  <span className="font-bold tabular-nums">Lv. {progress.level}</span>
                  <span className="text-muted-foreground tabular-nums">{progress.xp.toLocaleString()} / {progress.next_level_xp.toLocaleString()} XP</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-600 transition-all" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="space-y-2">
          <div className="grid grid-cols-[60px_1fr_1fr] gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-2">
            <div>Lv</div>
            <div>{t("free")}</div>
            <div className="text-fuchsia-400">{t("premium")}</div>
          </div>
          {rewards.map((r) => {
            const unlocked = (progress?.level ?? 0) >= r.level;
            const freeClaimed = (progress?.free_claimed ?? []).includes(r.level);
            const premClaimed = (progress?.premium_claimed ?? []).includes(r.level);
            const isPrem = !!progress?.premium;
            return (
              <div key={r.id} className={`grid grid-cols-[60px_1fr_1fr] gap-2 items-center rounded-xl border p-2 ${unlocked ? "border-primary/30 bg-card" : "border-border bg-muted/20"}`}>
                <div className={`text-center font-black text-lg tabular-nums ${unlocked ? "text-primary" : "text-muted-foreground"}`}>{r.level}</div>
                <RewardCell reward={r.free_reward} unlocked={unlocked} claimed={freeClaimed} onClaim={() => claim(r.level, "free")} t={t} />
                <RewardCell reward={r.premium_reward} unlocked={unlocked && isPrem} claimed={premClaimed} onClaim={() => claim(r.level, "premium")} premium t={t} />
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function RewardCell({ reward, unlocked, claimed, onClaim, premium, t }: any) {
  const credit = reward?.credit ?? 0;
  const badge = reward?.badge;
  return (
    <button
      disabled={!unlocked || claimed}
      onClick={onClaim}
      className={`relative rounded-lg p-2 min-h-[44px] text-left text-xs transition ${
        claimed ? "bg-muted/30 opacity-50" :
        unlocked ? (premium ? "bg-gradient-to-br from-fuchsia-500/20 to-violet-600/20 hover:from-fuchsia-500/30 hover:to-violet-600/30 border border-fuchsia-500/30" : "bg-primary/15 hover:bg-primary/25 border border-primary/20") :
        "bg-muted/10 border border-border"
      }`}
    >
      {!unlocked && <Lock size={10} className="absolute top-1 right-1 text-muted-foreground" />}
      {claimed && <span className="absolute top-1 right-1 text-[10px] text-muted-foreground">✓</span>}
      <div className="flex items-center gap-1.5">
        {badge ? <span className="text-base">🎖️</span> : <Gift size={12} />}
        <div>
          {credit > 0 && <Money className="font-bold block">{formatKRW(credit)}</Money>}
          {badge && <div className="font-bold">{t("badge")}</div>}
        </div>
      </div>
    </button>
  );
}
