/**
 * PhonStakingPanel — 실동작 PHON 스테이킹 패널.
 * stake_phon / unstake_phon / get_my_stakes RPC 통합.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Coins, Lock } from "lucide-react";
import { usePhonStaking } from "@/hooks/use-phon-staking";

function fmt(n: number) { return new Intl.NumberFormat("ko-KR").format(Math.floor(n)); }

export default function PhonStakingPanel() {
  const { summary, stakes, busy, stake, unstake } = usePhonStaking();
  const [amount, setAmount] = useState("");

  const apyPct = (summary.apy_bps / 100).toFixed(1);
  const dailyPreview = Math.floor((Number(amount) || 0) * summary.apy_bps / 10000 / 365);

  async function onStake() {
    const v = Number(amount);
    if (!v || v <= 0) return;
    const r = await stake(v);
    if (r.ok) setAmount("");
  }

  return (
    <Card className="rounded-2xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/60 to-teal-500/5 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[11px] tracking-[0.3em] font-black text-emerald-400 uppercase">
          PHON 스테이킹
        </div>
        <span className="text-[10px] text-muted-foreground">APY {apyPct}% · 매일 자동 배당</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl glass border border-border/40 p-3">
          <div className="text-[10px] tracking-widest text-muted-foreground mb-1">스테이크 중</div>
          <div className="font-imperial text-lg text-foreground tabular-nums">{fmt(summary.active_total)} <span className="text-xs text-muted-foreground">PHON</span></div>
        </div>
        <div className="rounded-xl glass border border-border/40 p-3">
          <div className="text-[10px] tracking-widest text-muted-foreground mb-1">누적 배당</div>
          <div className="font-imperial text-lg text-emerald-400 tabular-nums">+{fmt(summary.total_yield)} <span className="text-xs text-muted-foreground">PHON</span></div>
        </div>
      </div>

      {/* Stake form */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-3 space-y-2">
        <Input
          inputMode="decimal"
          placeholder="스테이킹할 PHON 수량 (최소 100)"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className="text-lg font-imperial tabular-nums"
        />
        {dailyPreview > 0 && (
          <div className="text-[11px] text-emerald-400">
            예상 일배당 +{fmt(dailyPreview)} PHON / 일
          </div>
        )}
        <Button
          onClick={onStake}
          disabled={busy || !amount}
          className="w-full min-h-11 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold"
        >
          <Sparkles className="w-4 h-4 mr-1" />
          {busy ? "처리 중…" : "지금 스테이킹"}
        </Button>
      </div>

      {/* Active stakes */}
      {stakes.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[10px] tracking-widest text-muted-foreground px-1">내 스테이크</div>
          {stakes.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl glass border border-border/40 p-3">
              <div className="min-w-0">
                <div className="text-sm font-bold tabular-nums">
                  <Coins className="inline w-3 h-3 mr-1 text-emerald-400" />
                  {fmt(s.amount)} PHON
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {s.status === "active" ? "활성" : "해제됨"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(s.started_at).toLocaleDateString("ko-KR")} 시작
                  {s.lock_days > 0 && <> · <Lock className="inline w-2.5 h-2.5" /> {s.lock_days}일 락업</>}
                </div>
              </div>
              {s.status === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => unstake(s.id)}
                  className="text-xs"
                >
                  해제
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
