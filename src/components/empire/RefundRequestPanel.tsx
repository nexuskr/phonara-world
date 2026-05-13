import { useEffect, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/notify";
import {
  getMyGodMode,
  getMyRefundRequest,
  refundErrorMessage,
  requestRefund,
} from "@/lib/trustV2";

const fmtKRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n || 0);

const STATUS_LABEL: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인 — 곧 환불 처리됩니다",
  rejected: "반려",
  completed: "환불 완료",
};

export default function RefundRequestPanel() {
  const [god, setGod] = useState<any>(null);
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [g, r] = await Promise.all([getMyGodMode(), getMyRefundRequest()]);
      setGod(g);
      setReq(r);
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
        <Loader2 className="w-4 h-4 animate-spin" /> 환불 자격 확인 중...
      </div>
    );
  }
  if (!god) return null;

  const windowExpired = new Date(god.claimed_at).getTime() < Date.now() - 7 * 86400_000;
  const remainingDays = Math.max(0, Math.ceil((new Date(god.claimed_at).getTime() + 7 * 86400_000 - Date.now()) / 86400_000));

  const onSubmit = async () => {
    setBusy(true);
    try {
      await requestRefund(reason);
      notify.success("환불 요청이 접수되었습니다. 24시간 이내 검토됩니다.");
      setReason("");
      await load();
    } catch (e: any) {
      notify.error(refundErrorMessage(e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 border border-secondary/20">
      <div className="flex items-center gap-2 text-secondary">
        <RotateCcw className="w-4 h-4" />
        <span className="font-imperial font-bold text-sm">7일 무조건 환불</span>
      </div>

      {req ? (
        <div className="mt-3 space-y-2 text-xs">
          <div>상태: <span className="font-bold text-foreground">{STATUS_LABEL[req.status] ?? req.status}</span></div>
          <div className="text-muted-foreground">신청 금액: <span className="text-foreground tabular-nums">{fmtKRW(Number(req.amount_krw))}</span></div>
          <div className="text-muted-foreground">신청일: {new Date(req.created_at).toLocaleString("ko-KR")}</div>
          {req.admin_memo && (
            <div className="rounded-lg bg-muted/30 p-2 text-foreground">관리자 메모: {req.admin_memo}</div>
          )}
        </div>
      ) : windowExpired ? (
        <div className="mt-3 text-xs text-muted-foreground">7일 환불 기간이 종료되었습니다.</div>
      ) : (
        <>
          <p className="mt-2 text-[11px] text-muted-foreground break-keep">
            첫 입금 후 7일 이내, 출금을 한 번도 진행하지 않으셨다면 원금 100% 환불이 가능합니다.
            <br />
            남은 기간: <span className="text-foreground font-bold">{remainingDays}일</span>
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="환불 사유를 5자 이상 입력해주세요."
            className="mt-3 min-h-[80px] text-sm"
            maxLength={500}
          />
          <Button
            onClick={onSubmit}
            disabled={busy || reason.trim().length < 5}
            className="w-full mt-3"
            variant="outline"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            환불 요청 ({fmtKRW(Number(god.deposit_amount_krw))})
          </Button>
        </>
      )}
    </div>
  );
}
