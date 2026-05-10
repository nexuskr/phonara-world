import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingPage } from "@/components/ui/loading-state";
import { notify } from "@/lib/notify";
import { Fingerprint, ShieldCheck, ArrowLeft, Trash2, Loader2 } from "lucide-react";

interface Passkey {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
}

/**
 * /security/passkey — Register passkeys (WebAuthn) and run a step-up
 * authentication flow that can replace TOTP for sensitive actions.
 */
export default function SecurityPasskey() {
  const nav = useNavigate();
  const { isReady, hasSession } = useAuthReady();
  const [supported, setSupported] = useState(true);
  const [keys, setKeys] = useState<Passkey[]>([]);
  const [busy, setBusy] = useState(false);
  const [deviceName, setDeviceName] = useState("");

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
  }, []);

  useEffect(() => {
    if (isReady && !hasSession) nav("/secure-auth", { replace: true });
  }, [isReady, hasSession, nav]);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const { data } = await (supabase.from("user_passkeys") as any)
      .select("id, device_name, created_at, last_used_at")
      .order("created_at", { ascending: false });
    setKeys((data as Passkey[]) ?? []);
  }

  async function register() {
    setBusy(true);
    try {
      const { data: opts, error } = await supabase.functions.invoke("passkey-options", {
        body: { action: "register" },
      });
      if (error || (opts as any)?.error) throw new Error((opts as any)?.error || error?.message);
      const attResp = await startRegistration({ optionsJSON: opts as any });
      const { error: vErr, data: vRes } = await supabase.functions.invoke("passkey-verify", {
        body: { action: "register", response: attResp, deviceName: deviceName || undefined },
      });
      if (vErr || (vRes as any)?.error) throw new Error((vRes as any)?.error || vErr?.message);
      notify.success("Passkey 등록 완료");
      setDeviceName("");
      await refresh();
    } catch (e: any) {
      const msg = e?.name === "NotAllowedError" ? "사용자가 취소했거나 시간이 초과되었습니다." : e?.message;
      notify.error("등록 실패", { description: msg });
    } finally { setBusy(false); }
  }

  async function stepUp() {
    setBusy(true);
    try {
      const { data: opts, error } = await supabase.functions.invoke("passkey-options", {
        body: { action: "auth" },
      });
      if (error || (opts as any)?.error) throw new Error((opts as any)?.error || error?.message);
      const asResp = await startAuthentication({ optionsJSON: opts as any });
      const { error: vErr, data: vRes } = await supabase.functions.invoke("passkey-verify", {
        body: { action: "auth", response: asResp },
      });
      if (vErr || (vRes as any)?.error) throw new Error((vRes as any)?.error || vErr?.message);
      notify.success("Passkey 인증 통과", { description: "30분 동안 강력 인증 상태가 유지됩니다." });
    } catch (e: any) {
      notify.error("인증 실패", { description: e?.message });
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("이 Passkey를 삭제하시겠어요?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("user_passkeys").delete().eq("id", id);
      if (error) throw error;
      notify.success("삭제됨");
      await refresh();
    } catch (e: any) {
      notify.error("삭제 실패", { description: e?.message });
    } finally { setBusy(false); }
  }

  if (!isReady) return <LoadingPage label="확인 중…" />;

  if (!supported) {
    return (
      <div className="container max-w-2xl py-10 px-4">
        <Card className="p-6 text-center space-y-2">
          <Fingerprint className="w-8 h-8 mx-auto text-muted-foreground" />
          <div className="font-bold">이 브라우저는 Passkey를 지원하지 않습니다</div>
          <div className="text-xs text-muted-foreground">최신 Chrome, Safari, Edge에서 다시 시도해주세요.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10 px-4 space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/profile" className="text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Fingerprint className="w-6 h-6 text-primary" />
          Passkey (생체 인증)
        </h1>
      </div>

      <Card className="p-5 space-y-3">
        <div className="font-bold text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> 새 Passkey 등록
        </div>
        <p className="text-xs text-muted-foreground">
          지문·얼굴 인식 또는 PIN으로 출금/관리자 작업을 보호합니다. 비밀번호보다 안전하고 빠릅니다.
        </p>
        <Input
          placeholder="기기 이름 (예: iPhone 15, MacBook Pro)"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value.slice(0, 40))}
          maxLength={40}
        />
        <Button onClick={register} disabled={busy} className="w-full">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
          이 기기에 Passkey 등록
        </Button>
      </Card>

      {keys.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="font-bold text-sm">등록된 Passkey ({keys.length})</div>
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <div className="text-sm font-medium">{k.device_name || "이름 없음"}</div>
                <div className="text-xs text-muted-foreground">
                  등록: {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at ? ` · 최근 사용: ${new Date(k.last_used_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(k.id)} disabled={busy}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={stepUp} disabled={busy} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Passkey로 강력 인증 (테스트)
          </Button>
        </Card>
      )}
    </div>
  );
}
