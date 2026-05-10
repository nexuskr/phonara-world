import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useMfaLevel } from "@/hooks/use-mfa-level";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingPage } from "@/components/ui/loading-state";
import { notify } from "@/lib/notify";
import { ShieldCheck, Smartphone, KeyRound, Loader2, ArrowLeft, Trash2 } from "lucide-react";

/**
 * /security/totp — Enroll, verify, and remove TOTP authenticators.
 * Uses Supabase Auth MFA which manages the secret server-side.
 */
export default function SecurityTotp() {
  const nav = useNavigate();
  const { isReady, hasSession } = useAuthReady();
  const mfa = useMfaLevel();

  const [factors, setFactors] = useState<any[]>([]);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isReady && !hasSession) nav("/secure-auth", { replace: true });
  }, [isReady, hasSession, nav]);

  useEffect(() => {
    refreshFactors();
  }, []);

  async function refreshFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Phonara · ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setEnroll({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (e: any) {
      notify.error("등록 실패", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnroll() {
    if (!enroll || code.length !== 6) return;
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: ch.id,
        code,
      });
      if (vErr) throw vErr;
      notify.success("TOTP 등록 완료", { description: "이제 출금/관리자 작업 시 인증 앱 코드가 필요합니다." });
      setEnroll(null);
      setCode("");
      await refreshFactors();
    } catch (e: any) {
      notify.error("인증 실패", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeFactor(id: string) {
    if (!confirm("이 인증 수단을 삭제하시겠어요? 출금/관리자 보호가 약해집니다.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      notify.success("삭제 완료");
      await refreshFactors();
    } catch (e: any) {
      notify.error("삭제 실패", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  if (!isReady) return <LoadingPage label="확인 중…" />;

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  return (
    <div className="container max-w-2xl py-10 px-4 space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/profile" className="text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          2단계 인증 (TOTP)
        </h1>
      </div>

      <Card className="p-5 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Smartphone className="w-4 h-4 text-secondary" />
          <span className="font-bold">현재 상태</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {mfa.isAal2
            ? "✅ 이번 세션은 AAL2 (강력 인증) 입니다."
            : verifiedFactors.length > 0
              ? "🟡 등록된 TOTP가 있습니다. 출금 시 코드를 입력하세요."
              : "⚪ 아직 2단계 인증을 등록하지 않았습니다."}
        </p>
      </Card>

      {verifiedFactors.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="font-bold text-sm">등록된 인증 수단</div>
          {verifiedFactors.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <div className="text-sm font-medium">{f.friendly_name || "Authenticator"}</div>
                <div className="text-xs text-muted-foreground">
                  등록: {new Date(f.created_at).toLocaleDateString()}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeFactor(f.id)} disabled={busy}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </Card>
      )}

      {!enroll ? (
        <Card className="p-5 space-y-3">
          <div className="font-bold text-sm flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            새 인증 수단 등록
          </div>
          <p className="text-xs text-muted-foreground">
            Google Authenticator, 1Password, Authy 등 표준 TOTP 앱과 호환됩니다.
          </p>
          <Button onClick={startEnroll} disabled={busy} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            등록 시작
          </Button>
        </Card>
      ) : (
        <Card className="p-5 space-y-4">
          <div className="font-bold text-sm">앱으로 QR 코드 스캔</div>
          <div
            className="flex justify-center bg-white p-4 rounded-xl"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: enroll.qr }}
          />
          <div className="text-xs text-muted-foreground text-center">
            QR을 스캔할 수 없다면 시크릿 키를 직접 입력:
            <code className="block mt-2 p-2 bg-muted rounded font-mono text-[11px] break-all">
              {enroll.secret}
            </code>
          </div>
          <Input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="앱에 표시된 6자리 코드"
            className="text-center text-2xl tracking-[0.5em] font-bold"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEnroll(null); setCode(""); }} className="flex-1">
              취소
            </Button>
            <Button onClick={verifyEnroll} disabled={busy || code.length !== 6} className="flex-1">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              인증 및 활성화
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
