/**
 * VipTradingRoom — VIP Pass 또는 Baron+ 전용 추천 코인 섹션.
 *
 * 표시 전용. 추천 = 24h 핫 심볼 Top 3 (get_hot_symbols_24h).
 * 클릭 시 phonara:set-symbol 커스텀 이벤트로 차트 심볼 교체 시그널.
 */
import { useVipRoom } from "@/hooks/use-vip-room";
import { useMyPhonLeverageBonus } from "@/hooks/use-my-phon-leverage-bonus";
import { useHotSymbols } from "@/hooks/use-hot-symbols";
import { Crown, Flame, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { LoadingList } from "@/components/ui/loading-state";

function dispatchSymbol(sym: string) {
  try {
    window.dispatchEvent(new CustomEvent("phonara:set-symbol", { detail: { symbol: sym } }));
  } catch {}
}

export default function VipTradingRoom() {
  const gate = useVipRoom();
  const rows = useHotSymbols(5);
  const loading = rows.length === 0;

  // 미인증/잠금 상태에서는 작은 티저만 노출 (정직한 마케팅)
  if (!gate.unlocked) {
    return (
      <div className="rounded-2xl border border-dashed border-pink/40 bg-card/30 p-4">
        <div className="flex items-center gap-2 text-pink mb-1">
          <Lock className="w-4 h-4" />
          <span className="font-imperial text-sm">VIP 트레이딩 룸</span>
        </div>
        <div className="text-xs text-muted-foreground">
          VIP Pass 또는 Baron 이상 등급에서 폐하의 추천 종목 3선을 매시간 받아보실 수 있습니다.
        </div>
        <div className="mt-2 flex gap-2">
          <Link to="/vip" className="text-[11px] font-bold text-pink hover:underline">VIP Pass 알아보기 →</Link>
          <Link to="/phon" className="text-[11px] font-bold text-primary hover:underline">PHON 확보하기 →</Link>
        </div>
      </div>
    );
  }

  const top3 = (rows ?? []).slice(0, 3);

  return (
    <div className="rounded-2xl border border-pink/40 bg-gradient-to-br from-pink/10 via-card/60 to-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-pink">
          <Crown className="w-4 h-4" />
          <span className="font-imperial text-sm tracking-wide">VIP 트레이딩 룸</span>
        </div>
        <span className="text-[10px] tracking-widest font-black text-pink/80 bg-pink/10 border border-pink/40 px-2 py-0.5 rounded-full">
          {gate.reason === "vip" ? "VIP PASS" : `EMPIRE ${gate.empireLevel}`}
        </span>
      </div>

      <div className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
        지난 24시간 동안 폐하들이 가장 많이 다룬 종목입니다. 누르면 차트가 즉시 전환됩니다.
      </div>

      {loading ? (
        <LoadingList rows={3} />
      ) : top3.length === 0 ? (
        <div className="text-xs text-muted-foreground py-3">잠시 후 새로운 시그널이 도착합니다.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {top3.map((r, i) => (
            <button
              key={r.sym}
              onClick={() => dispatchSymbol(r.sym)}
              className="text-left rounded-xl border border-border/40 bg-card/60 hover:border-pink/50 p-3 press transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-imperial text-sm text-foreground">{r.sym}</span>
                <span className="text-[10px] font-black text-pink">#{i + 1}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Flame className="w-3 h-3 text-pink" />
                {r.traders_24h.toLocaleString("ko-KR")}명 · {r.open_positions.toLocaleString("ko-KR")} 포지션
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
