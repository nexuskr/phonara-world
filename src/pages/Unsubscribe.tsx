import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, { headers: { apikey: ANON } });
        const j = await r.json();
        if (j.valid) setState("valid");
        else if (j.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch { setState("error"); }
    })();
  }, [token]);

  async function confirm() {
    if (!token) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    if (error) { setState("error"); return; }
    if ((data as any)?.success) setState("done");
    else if ((data as any)?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="glass-strong neon-border rounded-3xl p-8 max-w-md w-full text-center">
        <h1 className="font-display font-black text-2xl text-gradient-gold mb-4">이메일 수신 거부</h1>
        {state === "loading" && <p className="text-muted-foreground text-sm">확인 중...</p>}
        {state === "invalid" && <p className="text-destructive text-sm">유효하지 않거나 만료된 링크입니다.</p>}
        {state === "already" && <p className="text-secondary text-sm">이미 수신 거부 처리되어 있습니다.</p>}
        {state === "error" && <p className="text-destructive text-sm">처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>}
        {state === "done" && (
          <>
            <p className="text-secondary font-bold mb-2">✅ 수신 거부 완료</p>
            <p className="text-xs text-muted-foreground">앞으로 알림 이메일을 보내드리지 않습니다.</p>
          </>
        )}
        {state === "valid" && (
          <>
            <p className="text-sm text-muted-foreground mb-6">아래 버튼을 누르면 PHONETOK의 알림 이메일 수신이 중단됩니다.</p>
            <button onClick={confirm} disabled={busy}
              className="w-full py-3 rounded-2xl bg-gradient-gold text-gold-foreground font-bold disabled:opacity-50">
              {busy ? "처리 중..." : "수신 거부 확정"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
