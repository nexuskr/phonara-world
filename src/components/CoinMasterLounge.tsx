import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Coins, Zap, ShieldCheck, Sparkles, Lock } from "lucide-react";
import { LoadingCard } from "@/components/ui/loading-state";

interface Stats {
  unlocked: boolean;
  total_coin_deposits: number;
  threshold: number;
}

const THRESHOLD = 500_000;

export default function CoinMasterLounge() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("coin_master_unlocked,total_coin_deposits")
        .eq("id", user.id)
        .maybeSingle();
      setStats({
        unlocked: !!(data?.coin_master_unlocked),
        total_coin_deposits: Number(data?.total_coin_deposits ?? 0),
        threshold: THRESHOLD,
      });
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return <LoadingCard className="rounded-3xl" />;
  }

  const pct = Math.min(100, Math.round((stats.total_coin_deposits / stats.threshold) * 100));
  const remaining = Math.max(0, stats.threshold - stats.total_coin_deposits);

  if (stats.unlocked) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-amber-400/50 p-6 bg-gradient-to-br from-amber-500/15 via-rose-500/5 to-violet-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <header className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="w-7 h-7 text-amber-950" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-bold">VIP · COIN MASTER</div>
              <h2 className="font-imperial text-2xl font-black tracking-tight">코인 마스터 라운지</h2>
            </div>
          </header>

          <p className="text-sm text-muted-foreground mb-4 break-keep">
            총 <span className="text-amber-400 font-black">₩{stats.total_coin_deposits.toLocaleString()}</span> 코인 입금으로
            플랫폼 최상위 0.1% 등급에 진입했습니다. 다음 혜택이 자동으로 적용됩니다.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <Perk icon={Zap} title="출금 우선 처리" desc="대기열 최우선 — 평균 30분 이내 정산" />
            <Perk icon={Coins} title="코인 입금 보너스 +10%" desc="일반 +8% 대비 +2%p 추가" />
            <Perk icon={ShieldCheck} title="AML 한도 +50%" desc="일일 출금 한도 1.5배 자동 상향" />
            <Perk icon={Sparkles} title="전용 배지 · 라이브챗 골드" desc="이름 옆 👑 표시 + 24h VIP 채팅" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl glass border border-border/50 p-6">
      <header className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center border border-border/50">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">잠금 · COIN MASTER</div>
          <h2 className="font-imperial text-xl font-black tracking-tight">코인 마스터 라운지</h2>
        </div>
      </header>

      <p className="text-sm text-muted-foreground mb-3 break-keep">
        누적 코인 입금 <span className="text-foreground font-bold">₩{stats.threshold.toLocaleString()}</span> 달성 시 자동 해제 — 출금 우선·보너스 +2%p·AML 한도 +50%.
      </p>

      <div className="h-2 rounded-full bg-card overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums">
        <span className="text-muted-foreground">진행 ₩{stats.total_coin_deposits.toLocaleString()}</span>
        <span className="font-bold text-amber-400">남은 ₩{remaining.toLocaleString()} ({pct}%)</span>
      </div>
    </section>
  );
}

function Perk({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-card/60 border border-amber-500/20 p-3 flex gap-3">
      <Icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground break-keep">{desc}</div>
      </div>
    </div>
  );
}
