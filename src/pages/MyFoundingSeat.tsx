import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Crown, Sparkles, Calendar, History as HistoryIcon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMyFoundingSeat, getMyFoundingSeatHistory } from "@/lib/foundingSeason";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useWalletChannel } from "@pkg/realtime";

const EVENT_LABEL: Record<string, string> = {
  claim: "좌석 점유",
  release: "좌석 해제",
  season_end: "시즌 종료",
  settled: "정산 완료",
  perk_granted: "퍼크 지급",
};

export default function MyFoundingSeat() {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [s, h] = await Promise.all([getMyFoundingSeat(), getMyFoundingSeatHistory(80)]);
      setData(s); setHistory(h);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  useWalletChannel({
    key: "my:fs",
    bindings: [
      { event: "*", table: "founding_season_seats" },
      { event: "*", table: "founding_seat_events" },
    ],
    onEvent: () => void load(),
  });

  return (
    <Layout>
      <div className="container py-6 space-y-4 animate-liquid-in">
        <button onClick={() => nav("/empire")} className="flex items-center gap-1 text-xs text-muted-foreground min-h-[44px]">
          <ArrowLeft className="w-3.5 h-3.5" /> 제국으로
        </button>

        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-gold" />
          <h1 className="font-imperial text-2xl tracking-[0.18em] text-gradient-imperial">내 Founding 좌석</h1>
        </div>

        {loading && <LoadingList rows={3} />}

        {!loading && data && !data.has_seat && (
          <EmptyState
            title="아직 좌석 없음"
            description={data.season ? `${data.season.title} 시즌이 진행 중입니다. 첫 입금 GOD MODE로 좌석을 확보해보세요.` : "현재 진행 중인 Founding 시즌이 없습니다."}
            action={<button onClick={() => nav("/empire")} className="text-xs text-gold underline min-h-[44px] px-4">제국 페이지로</button>}
          />
        )}

        {!loading && data?.has_seat && data.season && (
          <>
            <div className="glass-strong rounded-3xl p-5 neon-border space-y-3 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-to-br from-gold/30 via-transparent to-primary/20" />
              <div className="relative">
                <div className="text-[11px] text-muted-foreground">{data.season.code}</div>
                <div className="font-imperial font-black text-2xl text-gradient-imperial mt-1">{data.season.title}</div>
                {data.season.subtitle && <div className="text-xs text-muted-foreground mt-1 break-keep">{data.season.subtitle}</div>}

                <div className="mt-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-gold/15 border border-gold/40 px-4 py-3">
                    <div className="text-[10px] text-muted-foreground">내 좌석</div>
                    <div className="font-imperial font-black text-3xl text-gold tabular-nums">#{data.seat.seat_no}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <Calendar className="inline w-3 h-3 mr-1" />
                    확보: {new Date(data.seat.claimed_at).toLocaleString()}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {data.season.active && <Badge color="emerald">진행중</Badge>}
                  {!data.season.active && !data.season.settled_at && <Badge color="amber">정산 대기</Badge>}
                  {data.season.settled_at && <Badge color="muted">정산 완료 · {new Date(data.season.settled_at).toLocaleDateString()}</Badge>}
                  <Badge color="primary">{data.season.total_seats}석 한정</Badge>
                </div>
              </div>
            </div>

            {Array.isArray(data.season.perks) && data.season.perks.length > 0 && (
              <div className="glass-strong rounded-3xl p-5 space-y-2">
                <div className="flex items-center gap-2 font-imperial font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-gold" /> 영구 퍼크
                </div>
                <ul className="space-y-1.5">
                  {data.season.perks.map((p: any, i: number) => (
                    <li key={i} className="text-xs text-gold/90 flex gap-2">
                      <span className="text-gold">◆</span><span className="break-keep">{String(p)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="glass-strong rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-imperial font-bold text-sm">
            <HistoryIcon className="w-4 h-4 text-primary" /> 좌석 이력
          </div>
          {history === null && <LoadingList rows={3} />}
          {history && history.length === 0 && <EmptyState title="이력 없음" description="아직 기록된 이벤트가 없습니다." />}
          {history && history.length > 0 && (
            <div className="space-y-1.5">
              {history.map(h => (
                <div key={h.id} className="glass rounded-2xl p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                      <span className="text-gold">{EVENT_LABEL[h.event_type] ?? h.event_type}</span>
                      <span className="text-[10px] text-muted-foreground">{h.season_title}</span>
                      {h.seat_no != null && <span className="text-[10px] tabular-nums text-muted-foreground">#{h.seat_no}</span>}
                    </div>
                    {h.note && <div className="text-[11px] text-muted-foreground mt-0.5 break-keep">{h.note}</div>}
                    {h.payload?.crown_multiplier && (
                      <div className="text-[11px] text-emerald-300 mt-0.5">Crown ×{h.payload.crown_multiplier}</div>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {new Date(h.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Badge({ color, children }: { color: "emerald" | "amber" | "muted" | "primary"; children: React.ReactNode }) {
  const cls = {
    emerald: "bg-emerald-500/20 text-emerald-300",
    amber: "bg-amber-500/20 text-amber-300",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/20 text-primary",
  }[color];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${cls}`}>{children}</span>;
}
