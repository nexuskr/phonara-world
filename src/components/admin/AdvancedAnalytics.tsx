import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import { LineMini, DonutMini } from "@/components/ui/mini-chart";
import { Bot, Crown, Trophy, UserPlus, TrendingUp } from "lucide-react";
import { LoadingPage } from "@/components/ui/loading-state";

type BotRow = { day: string; kind: "content"|"trading"|"image"; runs: number; claimed: number; failed: number; total_reward: number; avg_pnl_pct: number };
type TierRow = { tier: string; users: number; total_balance: number };
type TopUser = { user_id: string; nickname: string; tier: string; total_earned: number; today_earned: number; total_balance: number };
type RefRow  = { inviter_id: string; nickname: string; tier: string; invited: number; total_commission: number };

const TIER_COLOR: Record<string,string> = {
  normal: "hsl(var(--muted-foreground))",
  vip:    "hsl(var(--primary))",
  god:    "hsl(var(--secondary))",
  empire: "hsl(var(--gold))",
};
const KIND_COLOR: Record<string,string> = {
  content: "hsl(var(--primary))",
  trading: "hsl(var(--secondary))",
  image:   "hsl(var(--gold))",
};

export default function AdvancedAnalytics() {
  const [days, setDays] = useState(30);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [tops, setTops] = useState<TopUser[]>([]);
  const [refs, setRefs] = useState<RefRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      supabase.rpc("get_ai_bot_stats" as any, { _days: days }),
      supabase.rpc("get_tier_distribution" as any),
      supabase.rpc("get_top_users" as any, { _limit: 10 }),
      supabase.rpc("get_referral_leaderboard" as any, { _limit: 10 }),
    ]).then(([b, t, u, r]) => {
      if (!alive) return;
      setBots(((b.data as any[]) || []).map((x: any) => ({
        ...x,
        day: new Date(x.day).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
        runs: Number(x.runs), claimed: Number(x.claimed), failed: Number(x.failed),
        total_reward: Number(x.total_reward), avg_pnl_pct: Number(x.avg_pnl_pct),
      })));
      setTiers(((t.data as any[]) || []).map((x: any) => ({ ...x, users: Number(x.users), total_balance: Number(x.total_balance) })));
      setTops(((u.data as any[]) || []).map((x: any) => ({ ...x, total_earned: Number(x.total_earned), today_earned: Number(x.today_earned), total_balance: Number(x.total_balance) })));
      setRefs(((r.data as any[]) || []).map((x: any) => ({ ...x, invited: Number(x.invited), total_commission: Number(x.total_commission) })));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [days]);

  // Aggregate bot stats by kind
  const botByKind = ["content", "trading", "image"].map((k) => {
    const rows = bots.filter((b) => b.kind === k);
    return {
      kind: k,
      runs: rows.reduce((s, r) => s + r.runs, 0),
      claimed: rows.reduce((s, r) => s + r.claimed, 0),
      failed: rows.reduce((s, r) => s + r.failed, 0),
      reward: rows.reduce((s, r) => s + r.total_reward, 0),
      avg_pnl: rows.length ? rows.reduce((s, r) => s + r.avg_pnl_pct, 0) / rows.length : 0,
    };
  });

  // Daily total runs (sum across kinds)
  const dailyMap = new Map<string, number>();
  bots.forEach((b) => dailyMap.set(b.day, (dailyMap.get(b.day) || 0) + b.runs));
  const daily = Array.from(dailyMap.entries()).map(([day, runs]) => ({ day, runs }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold" /> 고급 분석
        </h3>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                days === d ? "bg-gradient-gold text-gold-foreground" : "glass text-muted-foreground"
              }`}>{d}일</button>
          ))}
        </div>
      </div>

      {loading && <LoadingPage />}

      {!loading && (
        <>
          {/* AI 봇 KPI */}
          <Card title="🤖 AI 봇 통계 (기간 합계)">
            <div className="grid grid-cols-3 gap-2">
              {botByKind.map((b) => (
                <div key={b.kind} className="glass rounded-xl p-3">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" style={{ color: KIND_COLOR[b.kind] }} />
                    <span className="text-[10px] font-bold uppercase">{b.kind}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">실행 / 정산</div>
                  <div className="font-display font-black text-sm">{b.runs} / {b.claimed}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">보상</div>
                  <div className="font-bold text-xs text-gold">{formatKRW(b.reward)}</div>
                  {b.kind === "trading" && (
                    <div className={`text-[10px] mt-1 font-bold ${b.avg_pnl >= 0 ? "text-secondary" : "text-destructive"}`}>
                      평균 PnL {b.avg_pnl >= 0 ? "+" : ""}{b.avg_pnl.toFixed(2)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* 일별 봇 실행 추이 */}
          {daily.length > 0 && (
            <Card title="일별 AI 봇 실행 추이">
              <LineMini
                data={daily as any}
                xKey="day"
                height={180}
                series={[{ key: "runs", name: "실행", color: "hsl(var(--gold))" }]}
              />
            </Card>
          )}

          {/* 티어 분포 */}
          <Card title="👑 등급 분포">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <DonutMini
                size={180}
                inner={50}
                data={tiers.map((t) => ({ name: t.tier, value: t.users, color: TIER_COLOR[t.tier] || "hsl(var(--muted))" }))}
              />
              <div className="space-y-1.5">
                {tiers.map((t) => (
                  <div key={t.tier} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLOR[t.tier] }} />
                      <span className="text-xs font-bold uppercase">{t.tier}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">{t.users}명</div>
                      <div className="text-[10px] text-muted-foreground">{formatKRW(t.total_balance)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* TOP 회원 */}
          <Card title="🏆 잔액 TOP 10">
            <div className="space-y-1.5">
              {tops.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-4">데이터 없음</div>}
              {tops.map((u, i) => (
                <div key={u.user_id} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-black ${i < 3 ? "bg-gradient-gold text-gold-foreground" : "glass text-muted-foreground"}`}>{i + 1}</span>
                    <span className="text-xs font-bold truncate">{u.nickname}</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: TIER_COLOR[u.tier] + "33", color: TIER_COLOR[u.tier] }}>{u.tier}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-gold">{formatKRW(u.total_balance)}</div>
                    <div className="text-[10px] text-muted-foreground">오늘 +{formatKRW(u.today_earned)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 추천인 리더보드 */}
          <Card title="🎁 추천인 리더보드">
            <div className="space-y-1.5">
              {refs.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-4">초대 기록 없음</div>}
              {refs.map((r, i) => (
                <div key={r.inviter_id} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserPlus className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-xs font-bold truncate">{r.nickname}</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: TIER_COLOR[r.tier] + "33", color: TIER_COLOR[r.tier] }}>{r.tier}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold">{r.invited}명 초대</div>
                    <div className="text-[10px] text-gold">+{formatKRW(r.total_commission)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="glass-strong rounded-2xl p-4 neon-border">
      <div className="text-[11px] font-bold text-muted-foreground mb-3">{title}</div>
      {children}
    </div>
  );
}
