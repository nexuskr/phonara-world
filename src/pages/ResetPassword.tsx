import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { LuxButton, LuxInput } from "@/components/ui/lux";

export default function ResetPassword() {
  const { t } = useTranslation("reset");
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        const tm = setTimeout(() => supabase.auth.getSession().then(({ data: d2 }) => {
          if (d2.session) setReady(true);
          else toast({ title: t("invalidLink"), description: t("invalidLinkDesc"), variant: "destructive" });
        }), 600);
        return () => clearTimeout(tm);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (password.length < 8) { toast({ title: t("tooShort"), variant: "destructive" }); return; }
    if (password !== confirm) { toast({ title: t("mismatch"), variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: t("done") });
      nav("/dashboard");
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-primary/25 blur-3xl blob" />

      <div className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-6 sm:p-7">
        <h1 className="font-imperial font-black text-2xl sm:text-3xl text-gradient-primary tracking-[0.04em]">{t("title")}</h1>
        <p className="text-xs text-muted-foreground mt-1 break-keep">{t("sub")}</p>

        <div className="space-y-3 mt-5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            <LuxInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("newPw")} />
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            <LuxInput type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t("confirmPw")} />
          </div>
        </div>

        <LuxButton onClick={submit} disabled={busy || !ready} block size="lg" className="mt-5">
          {busy ? t("processing") : ready ? t("cta") : t("verifying")}
        </LuxButton>
      </div>
    </div>
  );
}
