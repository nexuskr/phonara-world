import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CupPrizePool } from "@/packages/apex/events/CupPrizePool";
import { CupBracket } from "@/packages/apex/events/CupBracket";
import { CupLeaderboard } from "@/packages/apex/events/CupLeaderboard";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

const CupEntryModal = lazy(() => import("@/packages/apex/events/CupEntryModal").then((m) => ({ default: m.CupEntryModal })));

export default function ApexCup() {
  const [season, setSeason] = useState<any>(null);
  const [brackets, setBrackets] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEntry, setShowEntry] = useState(false);

  async function load() {
    setLoading(true);
    const { data: seasons } = await supabase.from("apex_cup_seasons" as any)
      .select("id").in("status", ["scheduled", "live"]).order("start_at", { ascending: true }).limit(1);
    const id = (seasons as any[])?.[0]?.id;
    if (!id) { setSeason(null); setLoading(false); return; }
    const { data: pkg } = await supabase.rpc("apex_cup_get_season" as any, { _season_id: id });
    const p = pkg as any;
    setSeason(p?.season ?? null);
    setBrackets(p?.brackets ?? []);
    setMyEntry(p?.my_entry ?? null);
    const { data: lb } = await supabase.rpc("apex_cup_get_leaderboard" as any, { _season_id: id, _limit: 20 });
    setLeaderboard((lb as any[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);

  if (loading) return <div className="p-4"><LoadingList rows={6} /></div>;
  if (!season) return <EmptyState title="진행중인 컵 없음" description="다음 시즌이 곧 시작됩니다." />;

  const entriesCount = season?.entries_count ?? leaderboard.length;
  return (
    <div className="space-y-4 p-4">
      <CupPrizePool
        prizePoolPhon={Number(season.prize_pool_phon ?? 0)}
        entryFeePhon={Number(season.entry_fee_phon ?? 0)}
        bracketSize={Number(season.bracket_size ?? 64)}
        entriesCount={entriesCount}
      />
      {!myEntry && season.status !== "done" && (
        <button onClick={() => setShowEntry(true)} className="w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground">
          🏆 지금 참가 ({Number(season.entry_fee_phon)} PHON)
        </button>
      )}
      {myEntry && <div className="rounded-md border border-primary/40 bg-primary/10 p-2 text-center text-sm">참가 완료 — {myEntry.eliminated_at ? "탈락" : "생존 중"}</div>}
      <div>
        <div className="mb-2 text-sm font-semibold">Bracket</div>
        <CupBracket brackets={brackets} />
      </div>
      <CupLeaderboard rows={leaderboard} />
      {showEntry && (
        <Suspense fallback={null}>
          <CupEntryModal seasonId={season.id} entryFeePhon={Number(season.entry_fee_phon ?? 0)}
            onClose={() => setShowEntry(false)} onEntered={load} />
        </Suspense>
      )}
    </div>
  );
}
