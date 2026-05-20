import { memo } from "react";

interface Match { id: string; round: number; slot_index: number; player_a_id: string | null; player_b_id: string | null; winner_id: string | null; settled_at: string | null; }
interface Props { brackets: Match[]; }

function mask(id: string | null) { if (!id) return "TBD"; return id.slice(0, 4) + "…" + id.slice(-3); }

export const CupBracket = memo(function CupBracket({ brackets }: Props) {
  const byRound = brackets.reduce<Record<number, Match[]>>((acc, m) => { (acc[m.round] ||= []).push(m); return acc; }, {});
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {rounds.map((r) => (
        <div key={r} className="min-w-[160px] space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Round {r}</div>
          {byRound[r].sort((a, b) => a.slot_index - b.slot_index).map((m) => (
            <div key={m.id} className={`rounded-md border p-2 text-xs ${m.settled_at ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
              <div className={m.winner_id === m.player_a_id ? "font-bold text-foreground" : "text-muted-foreground"}>{mask(m.player_a_id)}</div>
              <div className="my-1 text-[10px] text-muted-foreground">vs</div>
              <div className={m.winner_id === m.player_b_id ? "font-bold text-foreground" : "text-muted-foreground"}>{mask(m.player_b_id)}</div>
            </div>
          ))}
        </div>
      ))}
      {rounds.length === 0 && <div className="text-sm text-muted-foreground">브래킷 생성 대기중…</div>}
    </div>
  );
});
