import { memo } from "react";

interface Row { user_id: string; final_rank: number | null; entry_paid_phon: number; eliminated_at: string | null; }
interface Props { rows: Row[]; }

function mask(id: string) { return id.slice(0, 4) + "…" + id.slice(-4); }

export const CupLeaderboard = memo(function CupLeaderboard({ rows }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card/50">
      <div className="border-b px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Leaderboard</div>
      <ul className="divide-y">
        {rows.map((r, i) => (
          <li key={r.user_id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-mono text-muted-foreground">#{r.final_rank ?? i + 1}</span>
            <span className="font-medium">{mask(r.user_id)}</span>
            <span className={r.eliminated_at ? "text-muted-foreground" : "text-primary"}>{r.eliminated_at ? "OUT" : "ALIVE"}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">참가자 없음</li>}
      </ul>
    </div>
  );
});
