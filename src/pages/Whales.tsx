import { useEffect, useState } from "react";
import { useVisibleInterval } from "@/lib/util/visible-interval";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown, Flame, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import ImperialHud from "@/components/imperial/ImperialHud";
import EscalationCallout from "@/components/imperial/EscalationCallout";

type Row = {
  rank: number;
  nickname_masked: string;
  deposit_total_krw: number;
  is_total: number;
};

function fmt(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000_000)  return `₩${(n / 10_000_000).toFixed(1)}천만`;
  if (n >= 10_000)      return `₩${(n / 10_000).toFixed(0)}만`;
  return `₩${n.toLocaleString()}`;
}

export default function Whales() {
  const [rows, setRows] = useState<Row[] | null>(null);

  async function load() {
    const { data } = await supabase.rpc("get_whale_leaderboard" as any, {});
    setRows(((data as any[]) ?? []) as Row[]);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("whales-lb")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_whale_leaderboard" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  // 60s 폴링 — 탭 숨김 시 정지.
  useVisibleInterval(() => load(), 60_000);

  return (
    <Layout>
      <ImperialHud />
      <div className="container py-6 space-y-5">
        <header className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="font-imperial text-2xl font-black tracking-tight text-gradient-imperial">Whale Leaderboard</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground font-bold">SIM</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            오늘 KST 00시 기준 일별 입금 순위 · 매분 갱신 · 상위 3등 다음날 부스터 자동 적용
          </p>
        </header>

        <EscalationCallout />

        <section className="rounded-3xl border border-border/60 bg-card/40 overflow-hidden">
          {rows === null ? (
            <div className="p-4"><LoadingList rows={6} /></div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Trophy />}
              title="오늘 첫 순위를 차지하세요"
              description="가장 먼저 입금하는 사용자가 오늘의 1등 자리에 오릅니다."
              action={<Link to="/packages" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-imperial text-primary-foreground text-xs font-bold glow-imperial">지금 1등 차지하기 <ArrowRight className="w-3.5 h-3.5" /></Link>}
            />
          ) : (
            <ul className="divide-y divide-border/40">
              {rows.map((r) => (
                <li key={`${r.rank}-${r.nickname_masked}`} className="flex items-center gap-3 px-4 py-3">
                  <div className={
                    "w-9 h-9 rounded-full flex items-center justify-center font-imperial font-black text-sm " +
                    (r.rank === 1 ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                      : r.rank <= 3 ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-muted/40 text-muted-foreground")
                  }>
                    {r.rank <= 3 ? <Crown className="w-4 h-4" /> : `#${r.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{r.nickname_masked || `Anonymous #${r.rank}`}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">IS {r.is_total.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-imperial font-black text-base text-gradient-imperial tabular-nums">{fmt(r.deposit_total_krw)}</div>
                    <div className="text-[10px] text-muted-foreground">오늘 입금 · SIM</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5">
          <div className="flex items-center gap-2 text-primary">
            <Flame className="w-4 h-4" />
            <h2 className="font-imperial text-lg font-black tracking-tight">하루 ₩10억 도달 시</h2>
          </div>
          <ul className="text-xs text-muted-foreground mt-2 space-y-1 leading-relaxed">
            <li>· DEUS — 단 1명, 영구 1순위 출금</li>
            <li>· 30% 자동 매칭 보너스</li>
            <li>· 평생 PHANTOM 좌석</li>
            <li>· 5억 잭팟 자동 추첨권</li>
            <li>· 명예의 전당 영구 등재</li>
          </ul>
        </section>
      </div>
    </Layout>
  );
}
