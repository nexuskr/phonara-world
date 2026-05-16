import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, ShieldCheck } from "lucide-react";
import { getMyHistory, getMyStats, type HistoryFilter, type HistoryRow } from "@/lib/crash";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";
import FairnessPanel from "@/components/crash/FairnessPanel";
import { toCSV, downloadCSV } from "@/lib/csv";
import { notify } from "@/lib/notify";

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "cashed", label: "캐시아웃" },
  { id: "busted", label: "폭발" },
  { id: "today", label: "오늘" },
  { id: "7d", label: "7일" },
];

export default function CrashHistory() {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: stats } = useQuery({ queryKey: ["crash-stats"], queryFn: getMyStats, staleTime: 5000 });
  const { data: rows, isLoading } = useQuery({
    queryKey: ["crash-history", filter],
    queryFn: () => getMyHistory(100, 0, filter),
    staleTime: 5000,
  });

  const pl = useMemo(() => {
    if (!rows) return 0;
    return rows.reduce((acc, r) => acc + (Number(r.payout_phon) || 0) - Number(r.bet_phon), 0);
  }, [rows]);

  const onExport = () => {
    if (!rows?.length) { notify.info("내보낼 기록이 없어요"); return; }
    const csv = toCSV(rows.map((r) => ({
      time: r.created_at,
      round: r.round_id,
      bet: r.bet_phon,
      auto: r.auto_cashout ?? "",
      cashout_x: r.cashed_out_at_multiplier ?? "",
      crash_x: r.crash_multiplier,
      payout: r.payout_phon,
      won: r.won,
    })), [
      { key: "time", label: "시간" },
      { key: "round", label: "라운드" },
      { key: "bet", label: "베팅" },
      { key: "auto", label: "자동" },
      { key: "cashout_x", label: "캐시아웃 배수" },
      { key: "crash_x", label: "크래시 배수" },
      { key: "payout", label: "정산" },
      { key: "won", label: "승리" },
    ]);
    downloadCSV(`crash-history-${Date.now()}.csv`, csv);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/crash" className="w-11 h-11 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-foreground">내 Crash 기록</h1>
            <p className="text-[11px] text-muted-foreground">베팅·캐시아웃 내역과 공정성 검증</p>
          </div>
          <button onClick={onExport} className="w-11 h-11 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="CSV 내보내기">
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Summary chips */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <Chip label="총 베팅" value={`${stats.total}`} />
            <Chip label="승률" value={`${stats.total ? Math.round((stats.wins / stats.total) * 100) : 0}%`} />
            <Chip
              label="순손익"
              value={`${pl >= 0 ? "+" : ""}${Math.round(pl).toLocaleString()}`}
              valueClass={pl >= 0 ? "text-[hsl(var(--gold))]" : "text-destructive"}
            />
            <Chip label="최고 배수" value={`${Number(stats.best_mult || 0).toFixed(2)}x`} />
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 h-11 px-4 rounded-xl text-sm font-bold border transition active:scale-[0.98] ${
                filter === f.id
                  ? "bg-[hsl(var(--gold))]/15 border-[hsl(var(--gold))]/60 text-[hsl(var(--gold))]"
                  : "bg-card border-border/40 text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <LoadingList rows={6} />
        ) : !rows || rows.length === 0 ? (
          <EmptyState
            title="아직 기록이 없어요"
            description="Crash 라운드에 베팅하면 여기에 모든 내역이 쌓여요."
            action={<Link to="/crash" className="inline-flex h-11 px-4 items-center rounded-xl bg-[hsl(var(--gold))] text-background font-bold">Crash 하러 가기</Link>}
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.bet_id} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <button
                  onClick={() => setExpanded((cur) => (cur === r.bet_id ? null : r.bet_id))}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 min-h-14 active:bg-background/40 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{new Date(r.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="font-mono">#{r.seed_hash?.slice(0, 6)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">베팅</span>
                      <span className="font-bold tabular-nums text-foreground">{Number(r.bet_phon).toLocaleString()}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">크래시</span>
                      <span className={`font-bold tabular-nums ${Number(r.crash_multiplier) >= 2 ? "text-[hsl(var(--gold))]" : "text-destructive"}`}>
                        {Number(r.crash_multiplier).toFixed(2)}x
                      </span>
                    </div>
                  </div>
                  <RowOutcome row={r} />
                </button>
                {expanded === r.bet_id && (
                  <div className="px-4 pb-4">
                    <FairnessPanel roundId={r.round_id} defaultOpen compact />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1 pt-2">
          <ShieldCheck className="w-3 h-3 text-[hsl(var(--gold))]" /> 모든 결과는 공정성 검증 가능합니다
        </p>
      </div>
    </div>
  );
}

function Chip({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl bg-card border border-border/40 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-base font-black tabular-nums ${valueClass ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function RowOutcome({ row }: { row: HistoryRow }) {
  if (row.won && row.payout_phon > 0) {
    return (
      <div className="text-right">
        <div className="text-[10px] text-muted-foreground">+ {Number(row.cashed_out_at_multiplier ?? 0).toFixed(2)}x</div>
        <div className="text-base font-black tabular-nums text-[hsl(var(--gold))]">+{Number(row.payout_phon - row.bet_phon).toLocaleString()}</div>
      </div>
    );
  }
  return (
    <div className="text-right">
      <div className="text-[10px] text-muted-foreground">폭발</div>
      <div className="text-base font-black tabular-nums text-destructive">-{Number(row.bet_phon).toLocaleString()}</div>
    </div>
  );
}
