import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { User as UserIcon, Phone, Calendar, ShieldCheck } from "lucide-react";
import { LuxButton, LuxInput } from "@/components/ui/lux";
import { AdultOnlyBanner } from "@/components/AdultOnlyBanner";

export default function CompleteProfile() {
  const { t } = useTranslation("completeProfile");
  const nav = useNavigate();
  const { isReady, hasSession } = useAuthReady();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ realName: "", phone: "", birth: "", agreeTerms: false, agreeAge: false });
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const schema = z.object({
    realName: z.string().trim().min(2, t("validRealName")).max(40),
    phone: z.string().trim().regex(/^01[0-9]{8,9}$/, t("validPhone")),
    birth: z.string().min(1, t("validBirth")),
  });

  useEffect(() => {
    if (!isReady) return;
    if (!hasSession) {
      nav("/secure-auth", { replace: true });
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completed,is_adult,real_name,phone,birth_date")
        .eq("id", user.id)
        .maybeSingle();
      // 완전한 완료 상태(둘 다 true)일 때만 dashboard로 이동. 한쪽이라도 비면 머문다.
      if (profile?.profile_completed && profile?.is_adult) {
        nav("/dashboard", { replace: true });
        return;
      }
      if (profile) setForm(f => ({ ...f, realName: profile.real_name || "", phone: profile.phone || "", birth: profile.birth_date || "" }));
    })();
  }, [hasSession, isReady, nav]);

  async function submit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast({ title: t("validInput"), description: parsed.error.errors[0].message, variant: "destructive" }); return; }
    if (!form.agreeTerms || !form.agreeAge) { toast({ title: t("validTermsAge"), variant: "destructive" }); return; }
    const age = (Date.now() - new Date(form.birth).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 19) { toast({ title: "만 19세 이상만 이용 가능합니다", description: "본 서비스는 만 19세 이상 성인 전용입니다.", variant: "destructive" }); return; }

    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("noSession"));
      const rawProvider = user.app_metadata?.provider as string | undefined;
      // 매직링크 사용자는 supabase provider가 "email"로 표시되지만 비밀번호 회원가입과
      // 구분이 필요하므로 별도 라벨("magic")을 저장한다.
      const provider = rawProvider === "email" ? "magic" : (rawProvider || "social");

      // upsert로 행 부재 케이스(트리거 미동작 / 백필 미실행)에도 안전.
      // is_adult는 BEFORE INSERT/UPDATE 트리거가 birth_date로부터 계산.
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        real_name: form.realName,
        phone: form.phone,
        birth_date: form.birth,
        terms_agreed_at: new Date().toISOString(),
        age_confirmed: true,
        profile_completed: true,
        auth_provider: provider,
      } as any, { onConflict: "id" });
      if (error) throw error;

      // 게이트 통과 검증: 저장 직후 재조회해서 useAdultGate 판정 조건과 동일하게 확인.
      // 통과하지 못하면 머물면서 사용자에게 안내(루프 차단).
      const { data: verify } = await supabase
        .from("profiles")
        .select("profile_completed,is_adult")
        .eq("id", user.id)
        .maybeSingle();

      if (!verify?.profile_completed || !verify?.is_adult) {
        toast({
          title: "프로필 저장이 완전히 반영되지 않았습니다",
          description: "잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침 또는 재로그인해주세요.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: t("doneTitle"), description: t("doneDesc") });
      nav("/dashboard", { replace: true });
    } catch (e: any) {
      // Map server-side validate_profile_input trigger errors to friendly text
      const msg = String(e?.message ?? "");
      let friendly = msg;
      if (msg.includes("profile_input_invalid")) {
        if (msg.includes("real_name")) friendly = "실명 형식이 올바르지 않습니다 (한글/영문 2~20자)";
        else if (msg.includes("birth_date")) friendly = "생년월일을 다시 확인해 주세요 (만 19세 이상)";
        else if (msg.includes("phone")) friendly = "휴대폰 번호 형식이 올바르지 않습니다 (예: 01012345678)";
        else friendly = "입력값이 서버 검증을 통과하지 못했습니다";
      }
      toast({ title: t("error"), description: friendly, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden bg-background">
      <AdultOnlyBanner className="absolute top-0 left-0 right-0 z-20" />
      {/* Static accent glow — no animation, no backdrop-filter (mobile perf) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-30"
        style={{ background: "radial-gradient(closest-side, hsl(var(--accent)/0.45), transparent 70%)" }}
      />

      <div
        className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 border border-border/60"
        style={{ background: "linear-gradient(135deg, hsl(230 30% 14% / 0.96), hsl(230 30% 8% / 0.94))" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-secondary" />
          <span className="text-[11px] tracking-[0.3em] text-muted-foreground font-bold">{t("tag")}</span>
        </div>
        <h1 className="font-imperial font-black text-2xl sm:text-3xl text-gradient-primary tracking-[0.04em]">{t("title")}</h1>
        <p className="text-xs text-muted-foreground mt-1 break-keep">{t("sub")}</p>

        <div className="space-y-3 mt-5">
          <Field icon={<UserIcon className="w-4 h-4" />}>
            <LuxInput value={form.realName} onChange={e => set("realName", e.target.value)} placeholder={t("realName")} maxLength={40} className="!min-h-[44px] !border-0 !rounded-none !bg-transparent !px-0" />
          </Field>
          <Field icon={<Phone className="w-4 h-4" />}>
            <LuxInput value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} placeholder={t("phonePh")} maxLength={11} className="!min-h-[44px] !border-0 !rounded-none !bg-transparent !px-0" />
          </Field>
          <Field icon={<Calendar className="w-4 h-4" />}>
            <LuxInput type="date" value={form.birth} onChange={e => set("birth", e.target.value)} className="!min-h-[44px] !border-0 !rounded-none !bg-transparent !px-0 text-muted-foreground" />
          </Field>

          <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer px-1 min-h-[36px]">
            <input type="checkbox" checked={form.agreeTerms} onChange={e => set("agreeTerms", e.target.checked)} className="mt-0.5 accent-primary" />
            <span className="break-keep">{t("agreeTerms")}</span>
          </label>
          <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer px-1 min-h-[36px]">
            <input type="checkbox" checked={form.agreeAge} onChange={e => set("agreeAge", e.target.checked)} className="mt-0.5 accent-primary" />
            <span className="break-keep">{t("agreeAge")}</span>
          </label>
        </div>

        <LuxButton onClick={submit} disabled={busy} block size="lg" className="mt-5">
          {busy ? t("processing") : t("cta")}
        </LuxButton>
      </div>
    </div>
  );
}

function Field({ icon, children }: any) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass border border-border/40 focus-within:border-primary transition min-h-[52px]">
      <span className="text-muted-foreground shrink-0">{icon}</span>{children}
    </div>
  );
}
