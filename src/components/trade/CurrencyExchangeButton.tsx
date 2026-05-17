import { useState } from "react";
import { ArrowLeftRight, Coins } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSwapPhonKrw } from "@/hooks/use-swap-phon-krw";
import { KRW_PER_USDT } from "@/lib/trading/currency";

/**
 * CurrencyExchangeButton — Luxury gold pill, opens a swap dialog (PHON ↔ KRW),
 * with USDT display reference. Backed by existing `swap_phon_krw` RPC (AAL2 inside).
 * 신규 RPC 0.
 */
const PHON_PER_USDT = 1300;

export default function CurrencyExchangeButton() {
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<"phon_to_krw" | "krw_to_phon">("phon_to_krw");
  const [amount, setAmount] = useState("");
  const { swap, busy } = useSwapPhonKrw();

  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0;
  const usdtEq =
    dir === "phon_to_krw"
      ? (n / PHON_PER_USDT)
      : (n / KRW_PER_USDT);

  const onSubmit = async () => {
    if (!valid) return;
    const res = await swap(dir, n);
    if (res?.ok) {
      setOpen(false);
      setAmount("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide
                     bg-gradient-to-r from-amber-300 via-amber-400 to-rose-400 text-black
                     border border-amber-200/60 shadow-[0_0_22px_hsl(var(--gold)/0.45)]
                     hover:shadow-[0_0_32px_hsl(var(--gold)/0.7)] hover:-translate-y-0.5
                     transition-all duration-200 press"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          통화 교환
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-imperial tracking-[0.12em] flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            통화 교환 · PHON ↔ KRW
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={dir === "phon_to_krw" ? "default" : "outline"}
              onClick={() => setDir("phon_to_krw")}
              className="font-black tracking-wide"
            >
              PHON → KRW
            </Button>
            <Button
              type="button"
              variant={dir === "krw_to_phon" ? "default" : "outline"}
              onClick={() => setDir("krw_to_phon")}
              className="font-black tracking-wide"
            >
              KRW → PHON
            </Button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground tracking-wide">
              {dir === "phon_to_krw" ? "PHON 수량" : "KRW 금액"}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={dir === "phon_to_krw" ? "예: 50000" : "예: 100000"}
              className="font-mono tabular-nums"
            />
            {valid && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                ≈ <span className="text-amber-300 font-bold">{usdtEq.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> USDT 환산
              </p>
            )}
          </div>

          <Button
            type="button"
            onClick={onSubmit}
            disabled={!valid || busy}
            className="w-full font-black tracking-wide bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500 text-black hover:opacity-95"
          >
            {busy ? "교환 중…" : "지금 교환"}
          </Button>
          <p className="text-[10px] text-muted-foreground/80 text-center">
            한도·수수료는 백엔드 정책을 따릅니다. AAL2(보안) 필요 시 인증 화면이 뜹니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
