/**
 * ImperialBetSlip — 공용 베팅 확인 Bottom Sheet.
 *
 * 화살처럼 빠른 native-feel BottomSheet + Quick Amount Chip + Potential Win Glow.
 * 정밀 주문/포지션 오픈은 부모가 onConfirm 으로 처리한다. (money-flow 미터치)
 */
import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import ProvablyFairBadge from "./ProvablyFairBadge";
import { IMPERIAL_BET_COPY, IMPERIAL_QUICK_AMOUNTS } from "./imperialCopy";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Current bet amount (PHON) */
  amount: number;
  onAmountChange: (v: number) => void;
  /** Available balance (PHON) */
  balance: number;
  /** Estimated multiplier or odds — multiplied by amount for potential win */
  multiplier: number;
  busy?: boolean;
  onConfirm: () => void;
  /** Optional subtitle line (e.g., "BTC LONG · 10x") */
  subtitle?: string;
  /** Show "PHON 20% 할인" ribbon (true when betting with PHON) */
  showPhonDiscount?: boolean;
}

export default function ImperialBetSlip({
  open,
  onOpenChange,
  amount,
  onAmountChange,
  balance,
  multiplier,
  busy,
  onConfirm,
  subtitle,
  showPhonDiscount,
}: Props) {
  const potentialWin = Math.floor(amount * Math.max(1, multiplier));
  const onPick = (q: (typeof IMPERIAL_QUICK_AMOUNTS)[number]) => {
    if (q.kind === "max") return onAmountChange(Math.floor(balance));
    if (q.kind === "free" || q.kind === "amount" || q.kind === "comeback") {
      return onAmountChange(Math.min(Math.floor(balance), q.value ?? 0));
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} maxHeight="92vh">
      <div className="px-5 pt-1 pb-4 space-y-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-amber-300">
              <Crown className="w-4 h-4" />
              <span className="text-[11px] font-black tracking-[0.22em]">
                {IMPERIAL_BET_COPY.slipTitle}
              </span>
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">{subtitle}</div>
            )}
          </div>
          <ProvablyFairBadge size="sm" />
        </div>

        {/* Imperial question */}
        <p className="text-[13px] font-bold leading-snug">
          {IMPERIAL_BET_COPY.slipQuestion}
        </p>

        {/* PHON discount ribbon */}
        {showPhonDiscount && (
          <div className="rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-400/15 to-pink-500/10 px-3 py-2 flex items-center gap-2 text-[11px] text-amber-200 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            {IMPERIAL_BET_COPY.phonDiscountRibbon}
          </div>
        )}

        {/* Quick amount chips */}
        <div className="grid grid-cols-3 gap-2">
          {IMPERIAL_QUICK_AMOUNTS.map((q) => {
            const isFree = q.kind === "free";
            const isComeback = q.kind === "comeback";
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => onPick(q)}
                className={[
                  "min-h-12 rounded-xl text-xs font-black tabular-nums press border transition",
                  isFree
                    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300"
                    : isComeback
                      ? "border-pink-400/50 bg-pink-500/10 text-pink-200 hover:border-pink-300"
                      : "border-border/50 bg-card/50 text-foreground hover:border-amber-300/60",
                ].join(" ")}
              >
                {q.label}
              </button>
            );
          })}
        </div>

        {/* Amount input */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-black tracking-[0.15em] text-muted-foreground">
              베팅 PHON
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              보유 {Math.floor(balance).toLocaleString("ko-KR")}
            </span>
          </div>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amount || ""}
            onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
            placeholder="0"
            className="w-full min-h-14 px-4 rounded-xl bg-background/60 border border-border/40 focus:border-amber-300 outline-none font-display font-black text-2xl tabular-nums text-right"
          />
        </div>

        {/* Potential Win — Gold + Glow */}
        <motion.div
          key={potentialWin}
          initial={{ scale: 0.96, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="relative rounded-2xl p-4 bg-gradient-to-br from-amber-300 via-amber-400 to-pink-500 text-white shadow-[0_0_36px_-4px_hsl(38_92%_60%/0.55)]"
        >
          <div className="text-[11px] font-black tracking-[0.22em] opacity-90">
            {IMPERIAL_BET_COPY.potentialWinLabel}
          </div>
          <div className="font-display font-black text-3xl tabular-nums leading-tight mt-1">
            +{potentialWin.toLocaleString("ko-KR")}
            <span className="text-sm font-bold ml-2 opacity-85">PHON</span>
          </div>
          <div className="text-[10px] opacity-80 tabular-nums mt-0.5">
            × {multiplier.toFixed(2)} 배율 기준 예상치
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-amber-200/40" />
        </motion.div>

        {/* Actions */}
        <div className="grid grid-cols-[1fr_2fr] gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="min-h-14 rounded-2xl border border-border/60 bg-card/40 text-sm font-bold press disabled:opacity-50"
          >
            {IMPERIAL_BET_COPY.cancelCta}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || amount <= 0 || amount > balance}
            className="min-h-14 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-pink-500 text-white text-sm font-black tracking-wide press shadow-lg shadow-pink-500/30 disabled:opacity-50"
          >
            {busy ? "진군 중…" : IMPERIAL_BET_COPY.confirmCta}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
