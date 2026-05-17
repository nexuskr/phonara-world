/**
 * ImperialBetHistoryList — 황제의 승전 기록.
 * Won = Crown + Gold row + Replay. Lost = Warm King 위로 + 역전 입금 CTA.
 * 데이터 fetching 은 부모가 담당. (money-flow 미터치)
 */
import { Link } from "react-router-dom";
import { Crown, PlayCircle, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { IMPERIAL_BET_COPY } from "./imperialCopy";
import ProvablyFairBadge from "./ProvablyFairBadge";

export interface ImperialBetRow {
  id: string;
  whenLabel: string; // pre-formatted (e.g. "방금 전" / "14:23")
  title: string; // e.g. "BTC LONG 10x" or "Olympus 1000"
  betPhon: number;
  payoutPhon: number; // 0 if lost
  multiplier?: number; // e.g. 80 for jackpot
}

interface Props {
  rows: ImperialBetRow[] | null;
  /** Called with row.id when user clicks Replay */
  onReplay?: (id: string) => void;
}

export default function ImperialBetHistoryList({ rows, onReplay }: Props) {
  if (rows === null) {
    return (
      <div className="text-xs text-muted-foreground py-6 text-center">
        승전 기록을 불러오는 중…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="아직 승전 기록이 없습니다"
        description="첫 승부로 황실의 역사를 새기소서."
      />
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-black tracking-[0.22em] text-amber-300">
          황제의 승전 기록
        </span>
        <ProvablyFairBadge size="sm" />
      </div>
      {rows.map((r) => {
        const won = r.payoutPhon > 0;
        const delta = won ? r.payoutPhon - r.betPhon : -r.betPhon;
        const isJackpot = (r.multiplier ?? 0) >= 50;
        return (
          <div
            key={r.id}
            className={[
              "rounded-xl border p-3 transition",
              won
                ? isJackpot
                  ? "border-amber-300/70 bg-gradient-to-r from-amber-400/15 via-amber-300/10 to-pink-500/10 shadow-[0_0_20px_-6px_hsl(38_92%_60%/0.55)]"
                  : "border-emerald-400/40 bg-emerald-500/5"
                : "border-border/40 bg-card/40",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {won && (
                  <Crown
                    className={`w-4 h-4 shrink-0 ${
                      isJackpot ? "text-amber-300" : "text-emerald-300"
                    }`}
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {r.whenLabel} · 베팅 {r.betPhon.toLocaleString("ko-KR")} PHON
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`text-sm font-black tabular-nums ${
                    won ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {won ? "+" : ""}
                  {delta.toLocaleString("ko-KR")}
                </div>
                {r.multiplier != null && r.multiplier > 0 && (
                  <div
                    className={`text-[10px] tabular-nums ${
                      isJackpot ? "text-amber-300 font-black" : "text-muted-foreground"
                    }`}
                  >
                    × {r.multiplier.toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            {!won && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-background/40 border border-border/30 px-2.5 py-1.5">
                <span className="text-[11px] text-amber-200/90">
                  {IMPERIAL_BET_COPY.lostRow}
                </span>
                <Link
                  to="/wallet?from=loss_recover"
                  className="text-[10px] font-black text-pink-300 hover:text-pink-200 flex items-center gap-1"
                >
                  <Wallet className="w-3 h-3" /> 역전 입금
                </Link>
              </div>
            )}

            {onReplay && (
              <button
                type="button"
                onClick={() => onReplay(r.id)}
                className="mt-2 w-full inline-flex items-center justify-center gap-1 text-[11px] font-black text-amber-200/90 hover:text-amber-100 press"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                {IMPERIAL_BET_COPY.replay}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
