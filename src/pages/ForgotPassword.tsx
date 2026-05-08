import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import { LuxButton, LuxInput } from "@/components/ui/lux";

export default function ForgotPassword() {
  const { t } = useTranslation("forgot");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const v = z.string().email().safeParse(email.trim());
    if (!v.success) { toast({ title: t("invalid"), variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: t("done"), description: t("doneDesc") });
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-primary/25 blur-3xl blob" />

      <div className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-6 sm:p-7">
        <Link to="/secure-auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 min-h-[36px]">
          <ArrowLeft className="w-3 h-3" /> {t("back")}
        </Link>
        <h1 className="font-imperial font-black text-2xl sm:text-3xl text-gradient-primary tracking-[0.04em]">{t("title")}</h1>
        <p className="text-xs text-muted-foreground mt-1 break-keep">{t("sub")}</p>

        {sent ? (
          <div className="mt-6 p-4 rounded-2xl glass text-sm text-center">
            <p className="text-foreground font-bold">{t("sentTitle")}</p>
            <p className="text-xs text-muted-foreground mt-2 break-keep">{t("sentSub")}</p>
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <LuxInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("placeholder")} />
            </div>
            <LuxButton onClick={submit} disabled={busy} block size="lg" className="mt-4">
              {busy ? t("sending") : t("cta")}
            </LuxButton>
          </>
        )}
      </div>
    </div>
  );
}
