import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useDB, formatKRW } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LuxButton } from "@/components/ui/lux";
import ReferralLeaderboard from "@/components/ReferralLeaderboard";
import AIMissionCard from "@/components/AIMissionCard";
import WeeklyPassSection from "@/components/WeeklyPassSection";

type Q = {
  key: string; name: string; description: string; period: "daily" | "weekly";
  target: number; progress: number; claimed: boolean; xp: number; credit: number;
};

export default function Quests() {
  const [db] = useDB();
  const { t } = useTranslation("quests");
  const [quests, setQuests] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!db.user) return;
    setLoading(true);
    const { data } = await supabase.rpc("get_my_quests" as any);
    setQuests((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [db.user]);

  async function claim(key: string) {
    const { data, error } = await supabase.rpc("claim_quest" as any, { _quest_key: key });
    if (error) return toast({ title: t("claimFail"), description: error.message, variant: "destructive" });
    const r = data as any;
    toast({ title: t("claimed"), description: t("reward", { xp: r.xp, credit: formatKRW(r.credit) }) });
    load();
  }

  const daily = quests.filter((q) => q.period === "daily");
  const weekly = quests.filter((q) => q.period === "weekly");

  return (
    <Layout>
      <div className="space-y-6 pb-24">
        <header className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-background to-background border border-amber-500/20 p-6">
          <div className="flex items-center gap-3">
            <Zap className="text-amber-500" />
            <h1 className="font-imperial text-2xl font-black tracking-tight break-keep">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 break-keep">{t("subtitle")}</p>
        </header>

        <Section title={t("daily")} icon={<Clock size={18} />} quests={daily} onClaim={claim} loading={loading} t={t} />
        <Section title={t("weekly")} icon={<Clock size={18} />} quests={weekly} onClaim={claim} loading={loading} t={t} />
        <AIMissionCard />
        <WeeklyPassSection />
        <a href="/season-pass" className="block rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-rose-500/10 p-4 hover:border-amber-400/60 transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-400">월간 시즌패스</div>
              <div className="text-sm font-bold mt-0.5">레벨별 코인·뱃지·출금 우선 트랙 보기 →</div>
            </div>
            <span className="text-2xl">🏆</span>
          </div>
        </a>
        <ReferralLeaderboard />
      </div>
    </Layout>
  );
}

function Section({ title, icon, quests, onClaim, loading, t }: any) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">{icon}{title}</h2>
      <div className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">{t("loading")}</div>}
        {!loading && quests.length === 0 && <div className="text-sm text-muted-foreground">{t("empty")}</div>}
        {quests.map((q: Q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          const done = q.progress >= q.target;
          return (
            <div key={q.key} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold break-keep">{q.name}</h3>
                  <p className="text-xs text-muted-foreground break-keep">{q.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold tabular-nums">+{q.xp} XP</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold tabular-nums">{formatKRW(q.credit)}</span>
                  </div>
                </div>
                <LuxButton
                  size="sm"
                  variant={q.claimed ? "ghost" : done ? "primary" : "ghost"}
                  disabled={!done || q.claimed}
                  onClick={() => onClaim(q.key)}
                >
                  {q.claimed ? <CheckCircle2 size={14} /> : done ? t("claim") : <span className="tabular-nums">{q.progress}/{q.target}</span>}
                </LuxButton>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-amber-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
