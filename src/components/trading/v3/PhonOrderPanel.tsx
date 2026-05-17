/**
 * PhonOrderPanel — PHON 베팅 실연동 패널 (사이드카).
 * MegaOrderPanel(KRW, FREEZE) 와 독립.
 *
 * - LONG/SHORT 토글
 * - 레버리지 칩 (PHON 한도 자동 클램프)
 * - 베팅 PHON 입력 + 25/50/75/MAX
 * - 예상 청산가 + 20% 할인 강조
 * - PhonOrderConfirmSheet 로 확인
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Sparkles, Zap, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyPower } from "@/hooks/use-my-power";
import { useOpenPhonPosition, type Side } from "@/hooks/use-open-phon-position";
import { useMyPhonLeverageBonus } from "@/hooks/use-my-phon-leverage-bonus";
import { HOUSE_EDGE_DISCOUNT_RATE } from "@/lib/phonEconomy";
import { notify } from "@/lib/notify";

const PhonOrderConfirmSheet = lazy(() => import("./PhonOrderConfirmSheet"));

interface Props {
  symbol: string;
  price: number;
}

const LEV_PRESETS = [1, 5, 10, 25, 50, 100] as const;

function estimateLiq(side: Side, entry: number, leverage: number): number {
  if (!entry || !leverage) return 0;
  const buffer = 1 / leverage;
  return side === "long" ? entry * (1 - buffer * 0.95) : entry * (1 + buffer * 0.95);
}

export default function PhonOrderPanel({ symbol, price }: Props) {
  const { phon, maxLeverage, loading } = useMyPower();
  const bonus = useMyPhonLeverageBonus();
  const { open, busy } = useOpenPhonPosition();

  const [side, setSide] = useState<Side>("long");
  const [leverage, setLeverage] = useState<number>(10);
  const [amount, setAmount] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const cap = Math.max(maxLeverage, bonus.effective || 0, 10);
  const effLev = Math.min(leverage, cap);
  const amountNum = Number(amount) || 0;
  const discountPhon = Math.floor(amountNum * 0.01 * HOUSE_EDGE_DISCOUNT_RATE);
  const estLiq = useMemo(() => estimateLiq(side, price, effLev), [side, price, effLev]);

  const fillPct = (pct: number) => {
    if (!phon) return;
    setAmount(String(Math.floor(phon * pct)));
  };

  const onSubmit = () => {
    if (loading) return;
    if (amountNum <= 0) { notify.warning("베팅할 PHON 수량을 입력해 주세요"); return; }
    if (amountNum > phon) { notify.warning("보유한 PHON 이 부족해요", { description: "지금 충전하시면 즉시 가능해요" }); return; }
    if (effLev > cap) { notify.info("이 레버리지는 PHON 을 조금 더 모으셔야 열립니다"); return; }
    if (!price) { notify.warning("가격 수신 대기 중", { description: "잠시 후 다시 눌러 주세요" }); return; }
    setConfirmOpen(true);
  };

  const onConfirm = async () => {
    const r = await open({ symbol, side, leverage: effLev, amountPhon: amountNum });
    if (r.ok) {
      setConfirmOpen(false);
      setAmount("");
    }
  };

  return (
    <div className="rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-400/10 via-card/60 to-pink-500/10 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-300 to-pink-500 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[11px] font-black tracking-[0.2em] text-amber-300">PHON 베팅</div>
            <div className="text-[10px] text-muted-foreground">수수료 자동 -20% · 즉시 적용</div>
          </div>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <div>보유 PHON</div>
          <div className="font-black tabular-nums text-amber-200">
            {Math.floor(phon).toLocaleString("ko-KR")}
          </div>
        </div>
      </div>

      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide("long")}
          className={[
            "min-h-12 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 press transition",
            side === "long"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              : "bg-card/50 text-muted-foreground border border-border/40",
          ].join(" ")}
        >
          <TrendingUp className="w-4 h-4" /> LONG
        </button>
        <button
          type="button"
          onClick={() => setSide("short")}
          className={[
            "min-h-12 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 press transition",
            side === "short"
              ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30"
              : "bg-card/50 text-muted-foreground border border-border/40",
          ].join(" ")}
        >
          <TrendingDown className="w-4 h-4" /> SHORT
        </button>
      </div>

      {/* Leverage chips */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1 text-[11px] font-black tracking-[0.15em] text-muted-foreground">
            <Zap className="w-3 h-3 text-amber-300" /> 레버리지
          </div>
          <span className="text-[10px] text-muted-foreground">
            폐하 한도 <span className="text-amber-300 font-black">{cap}x</span>
            {bonus.active && <span className="ml-1 text-emerald-300">+{bonus.bonus_pct}% 보너스</span>}
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {LEV_PRESETS.map((lv) => {
            const locked = lv > cap;
            const active = lv === leverage;
            return (
              <button
                key={lv}
                type="button"
                onClick={() => !locked && setLeverage(lv)}
                disabled={locked}
                className={[
                  "shrink-0 min-w-[60px] min-h-11 px-3 rounded-xl text-sm font-black tabular-nums press transition border",
                  locked
                    ? "border-border/30 bg-muted/10 text-muted-foreground/50"
                    : active
                      ? "border-amber-300 bg-gradient-to-br from-amber-400/30 to-pink-500/30 text-amber-100"
                      : "border-border/40 bg-card/50 text-foreground hover:border-amber-300/60",
                ].join(" ")}
              >
                {lv}x
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount input */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] font-black tracking-[0.15em] text-muted-foreground">베팅 PHON</span>
          <button
            type="button"
            onClick={() => setAmount(String(Math.floor(phon)))}
            className="text-[10px] font-black text-amber-300 hover:underline"
          >
            MAX
          </button>
        </div>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full min-h-14 px-4 rounded-xl bg-background/60 border border-border/40 focus:border-amber-300 outline-none font-display font-black text-2xl tabular-nums text-right"
        />
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => fillPct(p)}
              className="min-h-10 rounded-lg bg-card/60 border border-border/40 text-[11px] font-black text-muted-foreground hover:border-amber-300/60 press"
            >
              {p === 1 ? "MAX" : `${p * 100}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Discount + Liq preview */}
      <div className="rounded-xl border border-amber-300/30 bg-amber-400/5 px-3 py-2 text-[11px] space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">절감 수수료</span>
          <span className="tabular-nums font-black text-amber-300">
            {discountPhon > 0 ? `-${discountPhon.toLocaleString("ko-KR")} PHON` : "—"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">예상 청산가</span>
          <span className="tabular-nums font-bold">
            {estLiq > 0 ? estLiq.toFixed(4) : "—"}
          </span>
        </div>
      </div>

      {/* Submit */}
      {phon <= 0 ? (
        <Link
          to="/phon"
          className="block w-full min-h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-pink-500 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 press shadow-lg shadow-pink-500/30"
        >
          <Wallet className="w-4 h-4" /> 먼저 PHON 확보하기
        </Link>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className={[
            "w-full min-h-14 rounded-2xl text-white font-black text-sm tracking-wide press shadow-lg disabled:opacity-50",
            side === "long"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30"
              : "bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/30",
          ].join(" ")}
        >
          {busy ? "진입 중…" : `${side === "long" ? "LONG 📈" : "SHORT 📉"} · ${effLev}x · ${amountNum > 0 ? Math.floor(amountNum).toLocaleString("ko-KR") : "0"} PHON`}
        </button>
      )}

      <Suspense fallback={null}>
        <PhonOrderConfirmSheet
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={onConfirm}
          busy={busy}
          side={side}
          symbol={symbol}
          leverage={effLev}
          amountPhon={amountNum}
          estLiq={estLiq}
        />
      </Suspense>
    </div>
  );
}
