import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { User as UserIcon, Phone, Calendar, ShieldCheck } from "lucide-react";

const schema = z.object({
  realName: z.string().trim().min(2, "실명을 입력해주세요").max(40),
  phone: z.string().trim().regex(/^01[0-9]{8,9}$/, "휴대폰 번호 형식이 올바르지 않습니다"),
  birth: z.string().min(1, "생년월일을 선택해주세요"),
});

export default function CompleteProfile() {
  const nav = useNavigate();
  const { isReady, hasSession } = useAuthReady();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ realName: "", phone: "", birth: "", agreeTerms: false, agreeAge: false });
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isReady) return;
    if (!hasSession) {
      nav("/secure-auth", { replace: true });
      return;
    }

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("profile_completed,real_name,phone,birth_date").eq("id", user.id).maybeSingle();
      if (profile?.profile_completed) { nav("/dashboard", { replace: true }); return; }
      if (profile) setForm(f => ({ ...f, realName: profile.real_name || "", phone: profile.phone || "", birth: profile.birth_date || "" }));
    })();
  }, [hasSession, isReady, nav]);

  async function submit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast({ title: "입력 확인", description: parsed.error.errors[0].message, variant: "destructive" }); return; }
    if (!form.agreeTerms || !form.agreeAge) { toast({ title: "약관 및 14세 이상 확인이 필요합니다", variant: "destructive" }); return; }
    const age = (Date.now() - new Date(form.birth).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 14) { toast({ title: "만 14세 이상부터 이용 가능합니다", variant: "destructive" }); return; }

    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없습니다");
      const { error } = await supabase.from("profiles").update({
        real_name: form.realName, phone: form.phone, birth_date: form.birth,
        terms_agreed_at: new Date().toISOString(), age_confirmed: true,
        profile_completed: true,
        auth_provider: user.app_metadata?.provider || "social",
      }).eq("id", user.id);
      if (error) throw error;
      toast({ title: "🎉 가입 완료", description: "환영합니다!" });
      nav("/dashboard");
    } catch (e: any) {
      toast({ title: "오류", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute -top-32 -right-32 w-[520px] h-[520px] bg-accent/25 blur-3xl blob" />

      <div className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-7">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-secondary" />
          <span className="text-[11px] tracking-[0.3em] text-muted-foreground font-bold">추가 정보</span>
        </div>
        <h1 className="font-display font-black text-2xl text-gradient-primary">정산을 위한 본인 인증</h1>
        <p className="text-xs text-muted-foreground mt-1">출금 시 필요한 정보입니다. 타인에게 절대 공개되지 않습니다.</p>

        <div className="space-y-3 mt-5">
          <Field icon={<UserIcon className="w-4 h-4" />}>
            <input value={form.realName} onChange={e=>set("realName", e.target.value)} placeholder="실명" maxLength={40}
              className="bg-transparent w-full focus:outline-none text-sm" />
          </Field>
          <Field icon={<Phone className="w-4 h-4" />}>
            <input value={form.phone} onChange={e=>set("phone", e.target.value.replace(/\D/g,""))} placeholder="휴대폰 (예: 01012345678)" maxLength={11}
              className="bg-transparent w-full focus:outline-none text-sm" />
          </Field>
          <Field icon={<Calendar className="w-4 h-4" />}>
            <input type="date" value={form.birth} onChange={e=>set("birth", e.target.value)}
              className="bg-transparent w-full focus:outline-none text-sm text-muted-foreground" />
          </Field>

          <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer px-1">
            <input type="checkbox" checked={form.agreeTerms} onChange={e=>set("agreeTerms", e.target.checked)} className="mt-0.5 accent-primary" />
            <span>(필수) <span className="text-foreground">이용약관</span> 및 <span className="text-foreground">개인정보처리방침</span>에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer px-1">
            <input type="checkbox" checked={form.agreeAge} onChange={e=>set("agreeAge", e.target.checked)} className="mt-0.5 accent-primary" />
            <span>(필수) 본인은 <span className="text-foreground">만 14세 이상</span>입니다.</span>
          </label>
        </div>

        <button onClick={submit} disabled={busy}
          className="mt-5 w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary hover:scale-[1.02] transition disabled:opacity-50">
          {busy ? "처리 중..." : "완료하고 시작하기"}
        </button>
      </div>
    </div>
  );
}

function Field({ icon, children }: any) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl glass border border-border/40 focus-within:border-primary transition">
      <span className="text-muted-foreground">{icon}</span>{children}
    </div>
  );
}
