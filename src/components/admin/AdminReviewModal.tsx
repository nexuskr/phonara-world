import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LuxButton } from "@/components/ui/lux";
import { X, Check, AlertTriangle } from "lucide-react";

type Kind = "deposit" | "package" | "withdrawal";
type Action = "approve" | "reject" | "complete";

const RPC_BY_KIND: Record<Kind, string> = {
  deposit: "admin_resolve_deposit",
  package: "admin_resolve_package",
  withdrawal: "admin_resolve_withdrawal",
};

const ID_ARG_BY_KIND: Record<Kind, string> = {
  deposit: "_request_id",
  package: "_purchase_id",
  withdrawal: "_request_id",
};

const DEFAULT_CHECKLIST = [
  { key: "receipt_match", label: "영수증·증빙 첨부" },
  { key: "amount_match", label: "신청 금액 일치" },
  { key: "name_match", label: "본인 명의 확인" },
  { key: "no_duplicate", label: "중복 신청 아님" },
  { key: "aml_clear", label: "AML 위험 없음" },
];

export default function AdminReviewModal({
  open,
  onClose,
  kind,
  requestId,
  defaultAction = "approve",
  onResolved,
  receiptUrl,
  expectedAmount,
}: {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  requestId: string;
  defaultAction?: Action;
  onResolved?: () => void;
  receiptUrl?: string | null;
  expectedAmount?: number | null;
}) {
  const [action, setAction] = useState<Action>(defaultAction);
  const [memo, setMemo] = useState("");
  const [reason, setReason] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocr, setOcr] = useState<{ amount: number | null; datetime_iso: string | null; sender: string | null; receiver: string | null; confidence: number; match?: "exact" | "near" | "mismatch" | null } | null>(null);

  async function runOcr() {
    if (!receiptUrl) { toast({ title: "영수증 이미지가 없습니다", variant: "destructive" }); return; }
    setOcrBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("receipt-ocr", {
        body: { image_url: receiptUrl, expected_amount: expectedAmount ?? null },
      });
      if (error) throw error;
      const r = data as any;
      if (!r?.ok) throw new Error(r?.error || "ocr failed");
      setOcr({ ...r.ocr, match: r.match });
      // Auto-tick checklist if amount matches
      if (r.match === "exact" || r.match === "near") {
        setChecks((p) => ({ ...p, amount_match: true, receipt_match: true }));
      }
      const mTxt = r.match === "exact" ? "정확히 일치" : r.match === "near" ? "근사 일치(±1%)" : r.match === "mismatch" ? "❌ 금액 불일치" : "참고용";
      toast({ title: `AI 분석 완료 — ${mTxt}`, description: r.ocr?.amount ? `OCR 금액: ₩${Number(r.ocr.amount).toLocaleString()}` : "금액 추출 실패" });
    } catch (e: any) {
      toast({ title: "AI 분석 실패", description: e.message ?? String(e), variant: "destructive" });
    } finally { setOcrBusy(false); }
  }

  if (!open) return null;

  async function submit() {
    if (busy) return;
    if (action === "reject" && !reason.trim()) {
      toast({ title: "거절 사유를 입력해주세요", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const args: Record<string, unknown> = {
        [ID_ARG_BY_KIND[kind]]: requestId,
        _action: action,
        _reason: reason || null,
        _memo: memo || null,
        _checklist: checks,
      };
      const { error } = await supabase.rpc(RPC_BY_KIND[kind] as any, args as any);
      if (error) throw error;
      toast({ title: "처리 완료", description: `${action} 처리됨` });
      onResolved?.();
      onClose();
    } catch (e: any) {
      toast({ title: "처리 실패", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const allowComplete = kind === "withdrawal";

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-lg glass-strong rounded-3xl p-5 sm:p-6 neon-border relative">
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center" aria-label="닫기">
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-imperial font-black text-lg">포렌식 검수</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{kind} · {requestId.slice(0, 8)}…</p>

        {receiptUrl && (
          <div className="mt-3 rounded-xl border border-accent/40 bg-accent/5 p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-accent">AI 영수증 분석</span>
              <button
                onClick={() => void runOcr()}
                disabled={ocrBusy}
                className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-gradient-imperial text-primary-foreground disabled:opacity-50"
              >
                {ocrBusy ? "분석 중…" : ocr ? "다시 분석" : "AI로 영수증 자동검증"}
              </button>
            </div>
            {ocr && (
              <div className="text-[11px] space-y-0.5">
                <div className={`font-black ${
                  ocr.match === "exact" ? "text-emerald-500"
                  : ocr.match === "near" ? "text-secondary"
                  : ocr.match === "mismatch" ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {ocr.match === "exact" ? "✓ 금액 정확 일치"
                   : ocr.match === "near" ? "≈ 금액 근사 일치 (±1%)"
                   : ocr.match === "mismatch" ? "✗ 금액 불일치"
                   : "참고용 (기대값 없음)"}
                  {" · "}신뢰도 {Math.round((ocr.confidence ?? 0) * 100)}%
                </div>
                {ocr.amount != null && <div>OCR 금액: <b className="tabular-nums">₩{Number(ocr.amount).toLocaleString()}</b></div>}
                {ocr.datetime_iso && <div className="text-muted-foreground">시각: {new Date(ocr.datetime_iso).toLocaleString("ko-KR")}</div>}
                {ocr.sender && <div className="text-muted-foreground">송금: {ocr.sender}</div>}
                {ocr.receiver && <div className="text-muted-foreground">수취: {ocr.receiver}</div>}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {(["approve", "reject", ...(allowComplete ? (["complete"] as Action[]) : [])] as Action[]).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`min-h-[44px] rounded-xl text-xs font-bold transition ${
                action === a
                  ? a === "reject"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-gradient-imperial text-primary-foreground"
                  : "glass text-muted-foreground"
              }`}
            >
              {a === "approve" ? "승인" : a === "reject" ? "거절" : "지급완료"}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-bold mb-1.5">증빙 체크리스트</div>
          <div className="space-y-1">
            {DEFAULT_CHECKLIST.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-xs cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={!!checks[c.key]}
                  onChange={(e) => setChecks((p) => ({ ...p, [c.key]: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span>{c.label}</span>
                {checks[c.key] && <Check className="w-3.5 h-3.5 text-emerald-500" />}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-bold">검수 메모 (사용자에게도 표시됨)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="예: 입금자명·금액·시간 일치 확인. 영수증 정상."
            className="mt-1 w-full glass rounded-xl px-3 py-2 text-xs"
          />
        </div>

        {action === "reject" && (
          <div className="mt-3">
            <label className="text-[11px] font-bold flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" /> 거절 사유 (필수)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              className="mt-1 w-full glass rounded-xl px-3 py-2 text-xs"
            />
          </div>
        )}

        <LuxButton onClick={submit} disabled={busy} block size="lg" className="mt-5">
          {busy ? "처리 중…" : "처리하기"}
        </LuxButton>
      </div>
    </div>
  );
}
