import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

type DocStatus = { doc_key: string; version: string; title: string; consented: boolean };
type StatusResp = { authenticated: boolean; documents: DocStatus[] };

const ROUTE_BY_KEY: Record<string, string> = {
  terms: "/legal/terms",
  privacy: "/legal/privacy",
  risk: "/legal/risk",
};

/**
 * LegalConsentGate
 * - 로그인된 사용자가 현재 시행 중인 법적 문서(약관/개인정보/리스크) 중
 *   미동의가 있으면 강제로 동의 모달을 표시.
 * - 모든 항목 체크 + 동의 버튼 클릭 시 record_legal_consent RPC 호출.
 */
export function LegalConsentGate() {
  const [missing, setMissing] = useState<DocStatus[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.rpc("get_my_legal_consent_status");
      if (!alive || error || !data) return;
      const resp = data as unknown as StatusResp;
      const need = (resp.documents ?? []).filter((d) => !d.consented);
      if (need.length > 0) {
        setMissing(need);
        setChecked(Object.fromEntries(need.map((d) => [d.doc_key, false])));
        setOpen(true);
      }
    }
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "SIGNED_IN") void load();
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  async function submit() {
    if (missing.some((d) => !checked[d.doc_key])) {
      notify.warning("모든 항목에 동의해주세요.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("record_legal_consent", {
      _doc_keys: missing.map((d) => d.doc_key),
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    setSubmitting(false);
    if (error) {
      notify.error("동의 저장 실패: " + error.message);
      return;
    }
    notify.success("동의가 저장되었습니다.");
    setOpen(false);
  }

  if (!open || missing.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* gated: cannot dismiss */ }}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-imperial tracking-[0.02em]">
            <ShieldCheck className="w-4 h-4 text-secondary" />
            서비스 이용 전 동의가 필요합니다
          </DialogTitle>
          <DialogDescription className="break-keep">
            Phonara를 계속 이용하시려면 아래 약관에 동의해주세요. 각 문서를 클릭해 전체 내용을 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {missing.map((d) => (
            <label key={d.doc_key} className="flex items-start gap-3 glass rounded-2xl p-3 cursor-pointer">
              <Checkbox
                id={`consent-${d.doc_key}`}
                checked={!!checked[d.doc_key]}
                onCheckedChange={(v) => setChecked((c) => ({ ...c, [d.doc_key]: !!v }))}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{d.title}</div>
                <Link
                  to={ROUTE_BY_KEY[d.doc_key] ?? "/trust"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary underline"
                >
                  전문 보기 →
                </Link>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{d.version}</span>
            </label>
          ))}
        </div>

        <Button
          onClick={submit}
          disabled={submitting || missing.some((d) => !checked[d.doc_key])}
          className="w-full mt-4 font-imperial tracking-[0.02em]"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          동의하고 계속하기
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default LegalConsentGate;
