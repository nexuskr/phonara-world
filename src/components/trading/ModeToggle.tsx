import { useState } from "react";
import { Beaker, Flame } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Mode } from "@/lib/trading/types";

export default function ModeToggle({
  mode, onChange, paperBalance, realAvailable,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  paperBalance: number;
  realAvailable: number;
}) {
  const [askReal, setAskReal] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fmtKrw = (n: number) => `₩${Math.floor(n).toLocaleString()}`;

  return (
    <>
      <div className="glass-strong rounded-3xl border border-primary/30 p-2 flex gap-2">
        <button
          onClick={() => onChange("paper")}
          className={`flex-1 rounded-2xl px-4 py-3 transition press relative overflow-hidden ${
            mode === "paper"
              ? "bg-cyan-500/15 border border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
              : "border border-border/40 hover:border-cyan-400/40"
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-xs font-black tracking-widest">
            <Beaker className={`w-4 h-4 ${mode === "paper" ? "text-cyan-300" : "text-muted-foreground"}`} />
            <span className={mode === "paper" ? "text-cyan-200" : "text-muted-foreground"}>PAPER</span>
          </div>
          <div className={`mt-1 font-mono tabular-nums text-sm font-bold ${mode === "paper" ? "text-cyan-100" : "text-muted-foreground"}`}>
            {fmt(paperBalance)} <span className="text-[10px] opacity-70">USDT</span>
          </div>
          <div className="text-[9px] mt-0.5 text-muted-foreground/60 uppercase tracking-wider">시뮬레이션</div>
        </button>

        <button
          onClick={() => mode === "real" ? onChange("real") : setAskReal(true)}
          className={`flex-1 rounded-2xl px-4 py-3 transition press relative overflow-hidden ${
            mode === "real"
              ? "bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-400/70 shadow-[0_0_40px_rgba(244,114,182,0.4)]"
              : "border border-border/40 hover:border-amber-400/50"
          }`}
        >
          {mode === "real" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent animate-pulse pointer-events-none" />
          )}
          <div className="flex items-center justify-center gap-2 text-xs font-black tracking-widest relative">
            <Flame className={`w-4 h-4 ${mode === "real" ? "text-amber-300" : "text-muted-foreground"}`} />
            <span className={mode === "real" ? "text-amber-100" : "text-muted-foreground"}>REAL · 100×</span>
          </div>
          <div className={`mt-1 font-mono tabular-nums text-sm font-bold relative ${mode === "real" ? "text-amber-100" : "text-muted-foreground"}`}>
            {fmt(realAvailable)} USDT
          </div>
        </button>
      </div>

      <Dialog open={askReal} onOpenChange={setAskReal}>
        <DialogContent className="border-red-600/60">
          <DialogHeader>
            <DialogTitle className="text-red-400 font-black">⚠️ REAL MODE 진입 동의</DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-xs leading-relaxed">
              <p>실제 Empire Balance가 사용됩니다. <strong className="text-red-400">최대 100배 레버리지</strong>로
              포지션이 청산되면 마진 전액(100%)을 잃을 수 있습니다.</p>
              <p>· 거래 수수료 0.1% (오픈 + 청산)<br/>
                 · 슬리피지 0.06% 불리하게 적용<br/>
                 · 음수 잔고 보호 없음 · 일일 손실 한도 없음<br/>
                 · 본 플랫폼은 어떠한 손실도 보상하지 않으며, 투자 권유가 아닙니다.</p>
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
            <span>나는 <strong>전액 손실 가능성</strong>을 이해하며, 모든 책임이 나에게 있음을 동의합니다.</span>
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAskReal(false)}>취소</Button>
            <Button
              disabled={!agreed}
              className="bg-red-600 hover:bg-red-600/90 text-white"
              onClick={() => { setAskReal(false); setAgreed(false); onChange("real"); }}
            >
              REAL 모드 진입
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
