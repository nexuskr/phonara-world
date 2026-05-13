import { useEffect, useState } from "react";
import { HeartHandshake, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import {
  claimLossProtection,
  getMyGodMode,
  getMyLossProtectionClaim,
  lossProtectionErrorMessage,
} from "@/lib/trustV2";
import { supabase } from "@/integrations/supabase/client";

const fmtKRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n || 0);

export default function LossProtectionGate() {
  const [god, setGod] = useState<any>(null);
  const [claim, setClaim] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [g, c] = await Promise.all([getMyGodMode(), getMyLossProtectionClaim()]);
      setGod(g);
      setClaim(c);
      const { data: bal } = await supabase
        .from("phon_balances")
        .select("balance")
        .maybeSingle();
      setBalance(Number(bal?.balance ?? 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> 손실 보호 상태 확인 중...
      </div>
    );
  }
  if (!god) return null;

  const expired = new Date(god.loss_protection_until).getTime() < Date.now();
  const netLoss = Math.max(0, Number(god.deposit_amount_krw) - balance);
  const refundEstimate = Math.round(netLoss * 0.7 * 100) / 100;
  const remainingMs = new Date(god.loss_protection_until).getTime() - Date.now();
  const remainingHours = Math.max(0, Math.floor(remainingMs / 3600_000));

  const onClaim = async () => {
    setBusy(true);
    try {
      await claimLossProtection();
      notify.success(`손실 보호 환급 완료: ${refundEstimate.toLocaleString("ko-KR")} PHON`);
      await load();
    } catch (e: any) {
      notify.error(lossProtectionErrorMessage(e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 border border-money-strong/20">
      <div className="flex items-center gap-2 text-money-strong">
        <HeartHandshake className="w-4 h-4" />
        <span className="font-imperial font-bold text-sm">70% 손실 보호 (Founding Emperor)</span>
      </div>

      {claim ? (
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <div>이미 손실 보호를 청구하셨습니다.</div>
          <div className="text-foreground">
            환급된 PHON: <span className="font-bold text-money-strong tabular-nums">{Number(claim.refunded_phon).toLocaleString("ko-KR")} PHON</span>
          </div>
        </div>
      ) : expired ? (
        <div className="mt-3 text-xs text-muted-foreground">
          7일 보호기간이 종료되었습니다. (만료: {new Date(god.loss_protection_until).toLocaleString("ko-KR")})
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Cell label="입금액" value={fmtKRW(Number(god.deposit_amount_krw))} />
            <Cell label="현재 잔액(PHON)" value={`${balance.toLocaleString("ko-KR")}`} />
            <Cell label="순손실" value={fmtKRW(netLoss)} highlight />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="text-muted-foreground">남은 시간: <span className="text-foreground font-bold">{remainingHours}시간</span></div>
            <div className="text-muted-foreground">예상 환급: <span className="text-money-strong font-bold tabular-nums">{refundEstimate.toLocaleString("ko-KR")} PHON</span></div>
          </div>
          <Button
            onClick={onClaim}
            disabled={busy || netLoss <= 0}
            className="w-full mt-3"
            variant="default"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {netLoss <= 0 ? "손실 없음 — 청구 불가" : "70% 손실 보호 청구"}
          </Button>
        </>
      )}
    </div>
  );
}

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/20 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-imperial font-bold text-sm tabular-nums mt-0.5 ${highlight ? "text-money-strong" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
