/**
 * ImperialCashOutPanel — 황제의 전략적 철수.
 *
 * 실시간 PnL + Partial Cash Out (25/50/75/100%) + 청산 임박 경고 + "역전 입금" CTA.
 * onCashOut(pct) 은 부모가 처리. (money-flow 미터치)
 */
import { Link } from "react-router-dom";
import { AlertTriangle, Crown, Wallet } from "lucide-react";
import { IMPERIAL_BET_COPY } from "./imperialCopy";

interface Props {
  /** Current realized + unrealized PnL in PHON (can be negative) */
  pnlPhon: number;
  /** Margin in PHON */
  marginPhon: number;
  /** Distance to liquidation as fraction 0..1 (0 = at liq, 1 = safe) */
  liquidationProximity: number;
  busy?: boolean;
  onCashOut: (pct: number) => void;
}

const PCTS = [25, 50, 75, 100] as const;

export default function ImperialCashOutPanel({
  pnlPhon,
  marginPhon,
  liquidationProximity,
  busy,
  onCashOut,
}: Props) {
  const profit = Math.max(0, Math.floor(pnlPhon));
  const inDanger = liquidationProximity < 0.1 && liquidationProximity >= 0;
  const tone =
    pnlPhon >= 0
      ? "from-emerald-500/15 to-amber-400/10 border-emerald-400/40"
      : "from-rose-500/15 to-amber-400/10 border-rose-400/40";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tone} p-4 space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-amber-300">
          <Crown className="w-4 h-4" />
          <span className="text-[11px] font-black tracking-[0.22em]">
            {IMPERIAL_BET_COPY.cashOutTitle}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">현재 손익</div>
          <div
            className={`font-display font-black text-xl tabular-nums ${
              pnlPhon >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {pnlPhon >= 0 ? "+" : ""}
            {Math.floor(pnlPhon).toLocaleString("ko-KR")} PHON
          </div>
        </div>
      </div>

      <div className="text-[12px] leading-snug">
        {inDanger ? (
          <span className="flex items-center gap-1.5 text-rose-200 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {IMPERIAL_BET_COPY.cashOutDangerNudge}
          </span>
        ) : profit > 0 ? (
          <span className="text-emerald-100">{IMPERIAL_BET_COPY.cashOutNudge(profit)}</span>
        ) : (
          <span className="text-muted-foreground">
            증거금 {Math.floor(marginPhon).toLocaleString("ko-KR")} PHON · 전략적 판단의 시간입니다
          </span>
        )}
      </div>

      {/* Partial cash out chips */}
      <div className="grid grid-cols-4 gap-1.5">
        {PCTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={busy}
            onClick={() => onCashOut(p)}
            className={[
              "min-h-12 rounded-xl text-xs font-black tabular-nums press border transition",
              p === 100
                ? "border-amber-300 bg-gradient-to-r from-amber-400 to-pink-500 text-white shadow-lg shadow-pink-500/30"
                : "border-border/50 bg-card/60 text-foreground hover:border-amber-300/60",
              busy ? "opacity-50" : "",
            ].join(" ")}
          >
            {p === 100 ? "전액 철수" : `${p}%`}
          </button>
        ))}
      </div>

      {inDanger && (
        <Link
          to="/wallet?from=cashout_save"
          className="block w-full min-h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 press shadow-lg shadow-rose-500/30"
        >
          <Wallet className="w-4 h-4" /> 역전 입금 — 전세를 뒤집기
        </Link>
      )}
    </div>
  );
}
