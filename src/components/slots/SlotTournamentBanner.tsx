import { useEffect, useState } from "react";
import { Trophy, Clock, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Tournament = {
  id: string;
  week_start_kst: string;
  starts_at: string;
  ends_at: string;
  prize_pool_phon: number;
  prize_split: number[];
  status: string;
  seconds_remaining: number;
};

type LbRow = {
  rank: number;
  user_id: string;
  nickname_masked: string;
  total_payout: number;
  spins: number;
  prize_estimate: number;
  is_me: boolean;
};

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtCountdown(s: number): string {
  if (s <= 0) return "정산 대기";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}일 ${h}시간 ${m}분`;
  if (h > 0) return `${h}시간 ${m}분 ${sec}초`;
  return `${m}분 ${sec}초`;
}

export default function SlotTournamentBanner() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [board, setBoard] = useState<LbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: t } = await supabase.rpc("get_current_slot_tournament" as any);
      const tour = Array.isArray(t) ? t[0] : t;
      if (cancelled) return;
      setTournament(tour ?? null);
      if (tour?.id) {
        const { data: lb } = await supabase.rpc("get_slot_tournament_leaderboard" as any, {
          _tournament_id: tour.id,
          _limit: 5,
        });
        if (!cancelled) setBoard(((lb as any) ?? []) as LbRow[]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    const i = setVisibleInterval(load, 30000 , { meta: { owner: "SlotTournamentBanner", category: "cosmetic" } });
    return () => { cancelled = true; i(); };
  }, []);

  // Local 1s ticker for the countdown
  useEffect(() => {
    return setVisibleInterval(() => setNow(Date.now()), 1000, { meta: { owner: "SlotTournamentBanner:tick", category: "cosmetic" } });
  }, []);

  if (loading) return <LoadingList rows={3} />;
  if (!tournament) return null;

  const remaining = Math.max(0, Math.floor((new Date(tournament.ends_at).getTime() - now) / 1000));
  const myRow = board.find((r) => r.is_me);

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-5 h-5 text-amber-50" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/90 font-semibold">
              주간 슬롯 토너먼트
            </div>
            <div className="text-sm font-bold text-foreground">
              상금 풀 <span className="text-amber-400">{fmt(tournament.prize_pool_phon)} PHON</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-background/40 border border-border/50">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-mono tabular-nums text-foreground/90">
            {fmtCountdown(remaining)}
          </span>
        </div>
      </div>

      {board.length === 0 ? (
        <div className="text-center text-xs text-foreground/50 py-3">
          첫 번째 우승자가 되어보세요 — 누적 페이아웃 1위에게 {fmt(tournament.prize_pool_phon * (tournament.prize_split[0] ?? 0) / 100)} PHON
        </div>
      ) : (
        <div className="space-y-1">
          {board.slice(0, 5).map((r) => (
            <div
              key={r.user_id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                r.is_me
                  ? "bg-amber-500/15 border border-amber-500/40"
                  : "bg-background/30"
              }`}
            >
              <span
                className={`w-6 text-center font-bold ${
                  r.rank === 1 ? "text-amber-400"
                  : r.rank === 2 ? "text-slate-300"
                  : r.rank === 3 ? "text-orange-400"
                  : "text-foreground/50"
                }`}
              >
                {r.rank === 1 ? "👑" : `${r.rank}`}
              </span>
              <span className="flex-1 truncate text-foreground/90">{r.nickname_masked}</span>
              <span className="text-foreground/60 tabular-nums">{fmt(r.total_payout)}</span>
              {r.prize_estimate > 0 && (
                <span className="text-amber-400 font-semibold tabular-nums">
                  +{fmt(r.prize_estimate)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {myRow ? (
        <div className="text-[11px] text-foreground/60 text-center">
          내 순위 <span className="text-amber-400 font-bold">{myRow.rank}위</span>
          {myRow.prize_estimate > 0 && (
            <> · 예상 상금 <span className="text-amber-400 font-bold">{fmt(myRow.prize_estimate)} PHON</span></>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-foreground/50 text-center flex items-center justify-center gap-1">
          <Crown className="w-3 h-3" /> 스핀할수록 누적 페이아웃이 올라가 순위에 진입합니다
        </div>
      )}
    </div>
  );
}
