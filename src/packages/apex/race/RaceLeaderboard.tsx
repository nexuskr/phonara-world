/**
 * P3-D — Race leaderboard panel (Stake-style).
 * Realtime via useGameChannel (apex_race_entries updates).
 */
import { useMemo } from "react";
import { useCurrentRaces, useRaceLeaderboard } from "./useApexRace";
import { useGameChannel } from "@pkg/realtime";
import { GlowCard } from "@/packages/apex/components/GlowCard";

function fmtCountdown(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "정산중";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
}

export function RaceLeaderboard() {
  const { data: races, loading } = useCurrentRaces();
  const active = races[0] ?? null;
  const rows = useRaceLeaderboard(active?.race_id ?? null, 50);

  useGameChannel(useMemo(() => ({
    key: active ? `race:${active.race_id}` : "race:none",
    enabled: !!active,
    bindings: active ? [{
      event: "*", schema: "public", table: "apex_race_entries",
      filter: `race_id=eq.${active.race_id}`,
    }] : [],
    onEvent: () => { /* polled every 15s */ },
  }), [active?.race_id]));

  if (loading) return <div className="text-sm text-muted-foreground">레이스 정보 로딩…</div>;
  if (!active) return <div className="text-sm text-muted-foreground">현재 진행중인 레이스가 없습니다.</div>;

  return (
    <GlowCard>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-300/80">
              {active.kind === "daily" ? "Daily Race" : "Weekly Race"}
            </div>
            <div className="text-2xl font-black apex-gradient-text">
              {active.prize_pool_phon.toLocaleString()} PHON
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">ends in</div>
            <div className="text-lg font-bold tabular-nums">{fmtCountdown(active.ends_at)}</div>
          </div>
        </div>
        {active.my_rank && (
          <div className="rounded bg-primary/10 px-3 py-2 text-xs">
            내 순위 <span className="font-bold text-primary">#{active.my_rank}</span> ·
            wagered <span className="tabular-nums">{active.my_wagered.toLocaleString()}</span>
          </div>
        )}
        <div className="max-h-[420px] overflow-auto rounded border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-muted-foreground sticky top-0">
              <tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">player</th><th className="px-3 py-2 text-right">wagered</th><th className="px-3 py-2 text-right">prize</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rank} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2 font-bold">{r.rank}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.masked_nick}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.wagered_phon.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-300">{r.prize_phon > 0 ? r.prize_phon.toLocaleString() : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">아직 참가자가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </GlowCard>
  );
}

export default RaceLeaderboard;
