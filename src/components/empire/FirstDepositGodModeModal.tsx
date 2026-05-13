/**
 * FirstDepositGodModeModal — 첫 입금 갓모드 청구 다이얼로그.
 * - claim_first_deposit_godmode RPC 호출
 * - 1유저 1회 한정. 이미 청구한 경우 차단.
 * - 입금 ≥ ₩50,000 시 +200% 보너스 + Founding Avatar + PHON + 7d 손실보호
 */
import { useEffect, useState } from "react";
import { Crown, Sparkles, Shield, Coins, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { claimFirstDepositGodMode, getMyGodModeStatus } from "@/lib/cashLoop";
import { notify } from "@/lib/notify";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed?: () => void;
}

const PRESETS = [50000, 100000, 200000, 500000, 1000000];

export default function FirstDepositGodModeModal({ open, onOpenChange, onClaimed }: Props) {
  const [amount, setAmount] = useState(100000);
  const [busy, setBusy] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  useEffect(() => {
    if (!open) return;
    getMyGodModeStatus().then((s) => setAlreadyClaimed(!!s));
  }, [open]);

  const bonus = Math.min(amount * 2, 2000000);
  const phon = Math.floor(amount / 1000) * 1000;
  const tier = amount >= 1000000 ? 5 : amount >= 500000 ? 4 : amount >= 200000 ? 3 : amount >= 100000 ? 2 : 1;

  async function handleClaim() {
    setBusy(true);
    try {
      await claimFirstDepositGodMode(amount);
      notify.success("갓모드 청구 완료", {
        description: `보너스 ₩${bonus.toLocaleString()} + ${phon.toLocaleString()} PHON + Founding Avatar T${tier}`,
      });
      onClaimed?.();
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.message || "claim_failed";
      if (msg.includes("already_claimed")) {
        setAlreadyClaimed(true);
        notify.error("이미 청구하신 보너스입니다", { description: "갓모드는 계정당 1회 한정입니다." });
      } else if (msg.includes("min_deposit")) {
        notify.error("최소 입금액", { description: "₩50,000 이상부터 갓모드가 발동됩니다." });
      } else {
        notify.error("청구 실패", { description: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-primary/40 bg-gradient-to-br from-background via-background to-primary/5">
        <DialogHeader>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-black text-amber-300 tracking-[0.2em] w-fit">
            <Crown className="w-3 h-3" /> GOD MODE · 1회 한정
          </div>
          <DialogTitle className="font-display font-black text-2xl text-gradient-imperial mt-2">
            첫 입금 갓모드
          </DialogTitle>
          <DialogDescription>
            평생 단 한 번. 모든 보상이 즉시 적용됩니다.
          </DialogDescription>
        </DialogHeader>

        {alreadyClaimed ? (
          <div className="p-4 rounded-xl bg-muted/50 border border-border text-center text-sm text-muted-foreground">
            이미 갓모드를 청구하셨습니다.<br />
            <span className="text-xs">계정당 1회 한정입니다.</span>
          </div>
        ) : (
          <>
            {/* 금액 선택 */}
            <div>
              <div className="text-xs font-bold text-muted-foreground mb-2">입금 금액</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={
                      "px-3 py-2 rounded-lg text-xs font-bold tabular-nums border transition " +
                      (amount === p
                        ? "bg-gradient-imperial text-primary-foreground border-primary"
                        : "bg-muted/30 text-foreground border-border hover:border-primary/40")
                    }
                  >
                    ₩{(p / 10000).toFixed(0)}만
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={50000}
                step={10000}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                className="mt-2 tabular-nums"
                placeholder="직접 입력"
              />
            </div>

            {/* 보상 미리보기 */}
            <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/30">
              <Reward icon={<Sparkles className="w-4 h-4" />} label="+200% 보너스" value={`₩${bonus.toLocaleString()}`} highlight />
              <Reward icon={<Coins className="w-4 h-4" />} label="PHON 사전 크레딧" value={`${phon.toLocaleString()} PHON`} />
              <Reward icon={<Crown className="w-4 h-4" />} label="Founding Avatar" value={`Tier ${tier}`} />
              <Reward icon={<Shield className="w-4 h-4" />} label="손실 보호" value="7일간 70%" />
            </div>

            <Button
              onClick={handleClaim}
              disabled={busy || amount < 50000}
              size="lg"
              className="w-full bg-gradient-imperial text-primary-foreground font-black glow-imperial hover:scale-[1.02] transition"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
              갓모드 청구 · ₩{amount.toLocaleString()}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              청구 즉시 보상이 계정에 반영됩니다. 입금 검증 후 자동 활성화.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Reward({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={highlight ? "text-amber-300" : "text-primary"}>{icon}</span>
        <span>{label}</span>
      </div>
      <span className={"font-black tabular-nums " + (highlight ? "text-amber-300" : "text-foreground")}>{value}</span>
    </div>
  );
}
