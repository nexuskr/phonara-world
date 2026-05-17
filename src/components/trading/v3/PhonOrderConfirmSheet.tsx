/**
 * PhonOrderConfirmSheet — 모바일 Bottom Sheet 주문 확인.
 * Thumb Zone 56px+ 버튼, framer-motion 스프링.
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Sparkles, ShieldCheck } from "lucide-react";
import { HOUSE_EDGE_DISCOUNT_RATE } from "@/lib/phonEconomy";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  side: "long" | "short";
  symbol: string;
  leverage: number;
  amountPhon: number;
  estLiq: number;
}

export default function PhonOrderConfirmSheet({
  open, onClose, onConfirm, busy, side, symbol, leverage, amountPhon, estLiq,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const isLong = side === "long";
  const sideColor = isLong ? "from-emerald-500 to-emerald-600" : "from-rose-500 to-rose-600";
  const discountPhon = Math.floor(amountPhon * 0.01 * HOUSE_EDGE_DISCOUNT_RATE);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={busy ? undefined : onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-x border-amber-400/40 bg-background shadow-2xl shadow-pink-500/20"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
            role="dialog" aria-label="PHON 주문 확인"
          >
            <div className="px-5 pt-4 pb-3 border-b border-border/30 flex items-center gap-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto" aria-hidden />
            </div>

            <div className="px-5 pt-3 pb-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-black tracking-[0.2em]">PHON 베팅 확인</span>
              </div>

              <div className={`rounded-2xl p-4 bg-gradient-to-br ${sideColor} text-white`}>
                <div className="flex items-center gap-2 text-xs font-black tracking-wide opacity-90">
                  {isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {isLong ? "LONG · 상승 베팅" : "SHORT · 하락 베팅"}
                </div>
                <div className="mt-1 font-display font-black text-2xl tracking-wide">
                  {symbol} · {leverage}x
                </div>
                <div className="mt-2 font-display font-black text-3xl tabular-nums">
                  {Math.floor(amountPhon).toLocaleString("ko-KR")}
                  <span className="text-sm font-bold ml-2 opacity-80">PHON</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-300/40 bg-gradient-to-br from-amber-400/10 to-pink-500/10 p-3 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <div className="font-bold text-amber-200">
                    수수료 자동 20% 할인 적용
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    원화 베팅 대비 약 <span className="text-amber-300 font-black tabular-nums">{discountPhon.toLocaleString("ko-KR")} PHON</span> 만큼
                    덜 빠집니다 · 폐하만의 특권이에요
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/50 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">예상 청산가</span>
                  <span className="tabular-nums font-bold">
                    {estLiq > 0 ? estLiq.toFixed(4) : "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="min-h-14 rounded-2xl border border-border/60 bg-card/40 text-sm font-bold press disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={busy}
                  className={`min-h-14 rounded-2xl bg-gradient-to-r ${sideColor} text-white text-sm font-black tracking-wide press shadow-lg disabled:opacity-50`}
                >
                  {busy ? "진입 중…" : `${isLong ? "LONG" : "SHORT"} 진입 확정`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
