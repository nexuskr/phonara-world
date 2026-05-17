/**
 * PhonSwapDialog — 실동작 PHON ↔ KRW 스왑 다이얼로그.
 * AAL2 미충족 시 RPC가 step_up_required 반환 → Warm King 안내.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp } from "lucide-react";
import { useSwapPhonKrw, type SwapDirection } from "@/hooks/use-swap-phon-krw";

const RATE_PHON_PER_KRW = 1300 / 1400;

export default function PhonSwapDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<SwapDirection>("krw_to_phon");
  const [amount, setAmount] = useState<string>("");
  const { swap, busy } = useSwapPhonKrw();

  const amt = Number(amount.replace(/[^\d.]/g, "")) || 0;
  const preview = useMemo(() => {
    if (!amt) return 0;
    return direction === "krw_to_phon" ? Math.floor(amt * RATE_PHON_PER_KRW) : Math.floor(amt / RATE_PHON_PER_KRW);
  }, [amt, direction]);

  const fromLabel = direction === "krw_to_phon" ? "원화 (KRW)" : "PHON";
  const toLabel   = direction === "krw_to_phon" ? "PHON" : "원화 (KRW)";

  async function onSubmit() {
    if (!amt) return;
    const r = await swap(direction, amt);
    if (r.ok) { setOpen(false); setAmount(""); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-imperial text-xl text-gradient-imperial">PHON 즉시 교환</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/60 p-3">
            <div className="text-[10px] tracking-widest text-muted-foreground mb-1">보낼 자산 · {fromLabel}</div>
            <Input
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl font-imperial tabular-nums"
            />
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setDirection((d) => d === "krw_to_phon" ? "phon_to_krw" : "krw_to_phon")}
              className="w-10 h-10 rounded-full border border-primary/40 bg-card flex items-center justify-center press"
              aria-label="방향 전환"
            >
              <ArrowDownUp className="w-4 h-4 text-primary" />
            </button>
          </div>

          <div className="rounded-xl border border-pink/40 bg-card/60 p-3">
            <div className="text-[10px] tracking-widest text-muted-foreground mb-1">받게 될 자산 · {toLabel}</div>
            <div className="text-2xl font-imperial tabular-nums text-pink">
              {preview.toLocaleString("ko-KR")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              환율 1 PHON ≈ {(1 / RATE_PHON_PER_KRW).toFixed(3)} KRW · 즉시 처리 · 일일 한도 ₩5,000,000
            </div>
          </div>

          <Button
            onClick={onSubmit}
            disabled={busy || !amt}
            className="w-full min-h-12 bg-gradient-to-r from-primary to-pink text-primary-foreground font-bold"
          >
            {busy ? "교환 진행 중…" : "지금 교환하기"}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            보안을 위해 2단계 인증(TOTP)이 활성화된 세션에서만 교환됩니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
