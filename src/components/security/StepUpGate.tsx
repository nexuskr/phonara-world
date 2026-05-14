import { useEffect, useState } from "react";
import { useNowTick } from "@/hooks/use-now-tick";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { ShieldCheck, Mail, Loader2, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

type Method = "totp" | "email" | null;

interface Props {
  open: boolean;
  /** UX 컨텍스트 라벨 (출금/관리자 등) */
  scope?: string;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * 통합 스텝업 인증 다이얼로그.
 * 사용자가 보유한 가장 강한 인증 수단을 자동 선택합니다:
 *   1) TOTP 등록되어 있으면 → AAL2 challenge
 *   2) 아니면 → 이메일 6자리 OTP (request_withdraw_otp / verify_withdraw_otp)
 */
export default function StepUpGate({ open, scope = "민감 작업", onClose, onVerified }: Props) {
  const [method, setMethod] = useState<Method>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailSentAt, setEmailSentAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!open) {
      setCode("");
      setEmailSentAt(null);
      setSecondsLeft(0);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        const totp = data?.totp?.find((f: any) => f.status === "verified");
        if (!alive) return;
        if (totp) {
          setMethod("totp");
          setFactorId(totp.id);
        } else {
          setMethod("email");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open]);

  const _stepUpTick = useNowTick(1000);
  useEffect(() => {
    if (!emailSentAt) return;
    setSecondsLeft(Math.max(0, 300 - Math.floor((Date.now() - emailSentAt) / 1000)));
  }, [emailSentAt, _stepUpTick]);

  async function verifyTotp() {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
      if (error) throw error;
      notify.success("강력 인증 완료");
      setCode("");
      onVerified();
    } catch (e: any) {
      notify.error("인증 실패", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("request_withdraw_otp" as any);
      if (error) throw error;
      setEmailSentAt(Date.now());
      notify.success("인증 코드를 이메일로 발송했어요", { description: "5분 이내에 입력해주세요." });
    } catch (e: any) {
      const msg = e?.message?.includes("rate_limited")
        ? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
        : e?.message ?? "발송 실패";
      notify.error("OTP 발송 실패", { description: msg });
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail() {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("verify_withdraw_otp" as any, { _code: code });
      if (error) throw error;
      notify.success("본인확인 완료");
      onVerified();
    } catch (e: any) {
      const map: Record<string, string> = {
        invalid_code: "코드가 일치하지 않습니다.",
        no_active_code: "유효한 코드가 없습니다. 다시 발송해주세요.",
        too_many_attempts: "시도 횟수를 초과했습니다. 새 코드를 요청해주세요.",
        invalid_format: "6자리 숫자를 입력해주세요.",
      };
      const key = (e?.message ?? "").trim();
      notify.error("인증 실패", { description: map[key] ?? key });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            추가 인증
          </DialogTitle>
          <DialogDescription>
            {scope} 진행 전 본인확인이 필요합니다.
            {method === "totp" && " 등록한 인증 앱에서 6자리 코드를 입력하세요."}
            {method === "email" && " 등록된 이메일로 6자리 인증 코드를 보내드립니다."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && method === "totp" && (
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); void verifyTotp(); }}
          >
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6자리 코드"
              className="text-center text-2xl tracking-[0.5em] font-bold"
              autoFocus
            />
            <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              확인
            </Button>
          </form>
        )}

        {!loading && method === "email" && (
          <div className="space-y-3">
            <Button
              onClick={sendEmail}
              disabled={busy || secondsLeft > 240}
              className="w-full"
              variant={emailSentAt ? "outline" : "default"}
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {emailSentAt ? `재발송 ${secondsLeft > 240 ? `(${secondsLeft - 240}s)` : "가능"}` : "인증 코드 발송"}
            </Button>

            {emailSentAt && (
              <>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6자리 코드"
                  className="text-center text-2xl tracking-[0.5em] font-bold"
                  autoFocus
                />
                <div className="text-xs text-muted-foreground text-center">
                  남은 시간: {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                </div>
                <Button onClick={verifyEmail} disabled={busy || code.length !== 6 || secondsLeft === 0} className="w-full">
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  확인
                </Button>
              </>
            )}
            <div className="text-xs text-muted-foreground text-center pt-1">
              더 강력한 보호를 원하시면{" "}
              <Link to="/security/totp" className="text-primary font-bold hover:underline">
                인증 앱(TOTP)
              </Link>{" "}
              을 등록해주세요.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
