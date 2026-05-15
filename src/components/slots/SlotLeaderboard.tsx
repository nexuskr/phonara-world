import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, Zap, Crown } from "lucide-react";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";

type Row = {
  rank: number;
  masked_name: string;
  game_code: string;
  total_bet: number;
  total_payout: number;
  net: number;
  spin_count: number;
  max_multiplier: number;
  max_payout: number;
};

type WindowKey = "24h" | "7d";
type MetricKey = "total_payout" | "max_multiplier" | "net";

const METRICS: { key: MetricKey; label: string; icon: typeof Trophy }[] = [
  { key: "total_payout", label: "누적 페이아웃", icon: Trophy },
  { key: "max_multiplier", label: "최고 한 방", icon: Zap },
  { key: "net", label: "순이익", icon: TrendingUp },
];

function fmt(n: number) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function rankBadge(r: number) {
  if (r === 1) return "bg-amber-400/20 text-amber-300 border-amber-400/40";
  if (r === 2) return "bg-slate-300/20 text-slate-200 border-slate-300/40";
  if (r === 3) return "bg-amber-700/20 text-amber-500 border-amber-700/40";
  return "bg-muted/30 text-muted-foreground border-border/40";
}

export default function SlotLeaderboard({ gameCode }: { gameCode?: string }) {
  const [windowKey, setWindowKey] = useState<WindowKey>("24h");
  const [metric, setMetric] = useState<MetricKey>("total_payout");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    (async () => {
      const { data, error } = await (supabase.rpc as any)("get_slot_leaderboard", {
        _window: windowKey,
        _game_code: gameCode ?? null,
        _metric: metric,
        _limit: 20,
      });
      if (!alive) return;
      if (error) {
        notify.error("리더보드를 불러오지 못했습니다", { description: error.message });
        setRows([]);
        return;
      }
      setRows((data ?? []) as Row[]);
    })();
    return () => { alive = false; };
  }, [windowKey, metric, gameCode]);

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" />
          <h3 className="font-imperial tracking-[0.18em] text-sm">SLOT 리더보드</h3>
        </div>
        <div className="inline-flex rounded-full bg-muted/40 p-0.5 border border-border/40">
          {(["24h", "7d"] as WindowKey[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindowKey(w)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition ${
                windowKey === w ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {METRICS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition ${
              metric === key
                ? "bg-primary/15 text-primary border border-primary/40"
                : "bg-muted/30 text-muted-foreground border border-border/40 hover:text-foreground"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {rows === null && <LoadingList rows={6} />}
        {rows && rows.length === 0 && (
          <EmptyState title="아직 기록이 없습니다" description="첫 우승자가 되어보세요." />
        )}
        {rows && rows.map((r) => {
          const primary =
            metric === "max_multiplier"
              ? `${Number(r.max_multiplier).toFixed(2)}×`
              : metric === "net"
                ? `${r.net >= 0 ? "+" : ""}${fmt(r.net)}`
                : fmt(r.total_payout);
          const sub =
            metric === "max_multiplier"
              ? `최고 +${fmt(r.max_payout)} PHON`
              : metric === "net"
                ? `${fmt(r.spin_count)} 스핀 · 베팅 ${fmt(r.total_bet)}`
                : `${fmt(r.spin_count)} 스핀 · 최고 ${Number(r.max_multiplier).toFixed(2)}×`;
          const positive = metric === "net" ? r.net >= 0 : true;
          return (
            <div
              key={`${r.rank}-${r.masked_name}`}
              className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/20 transition"
            >
              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold tabular-nums ${rankBadge(r.rank)}`}
              >
                {r.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{r.masked_name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
              </div>
              <div className={`font-mono text-sm font-bold tabular-nums ${positive ? "text-emerald-400" : "text-red-400"}`}>
                {primary}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
