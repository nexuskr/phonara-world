import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";

export default function SecureAuth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password) { toast({ title: "이메일과 비밀번호를 입력해주세요" }); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const redirectUrl = `${window.location.origin}/secure-wallet`;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: redirectUrl, data: { nickname: nickname || email.split("@")[0] } },
        });
        if (error) throw error;
        toast({ title: "🎉 가입 완료", description: "이메일 인증 후 로그인해주세요." });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "환영합니다 ✨" });
        nav("/secure-wallet");
      }
    } catch (e: any) {
      toast({ title: "오류", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-primary/25 blur-3xl blob" />
      <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] bg-accent/25 blur-3xl blob" style={{ animationDelay: "-7s" }} />

      <div className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-7 animate-liquid-in">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-secondary" />
          <span className="text-[11px] tracking-[0.3em] text-muted-foreground font-bold">SECURE • V3</span>
        </div>
        <h1 className="font-display font-black text-3xl text-gradient-primary">폰미션 금융 콘솔</h1>
        <p className="text-xs text-muted-foreground mt-1">Golden Side Hustle Engine — 원자성 정산 + 실시간 잔고</p>

        <div className="grid grid-cols-2 gap-2 mt-5 mb-4">
          {(["login","signup"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`py-2 rounded-xl text-xs font-bold transition ${mode===m?"bg-gradient-primary text-primary-foreground glow-primary":"glass text-muted-foreground"}`}>
              {m === "login" ? "로그인" : "가입"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <Field icon={<Sparkles className="w-4 h-4" />}>
              <input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="닉네임"
                className="bg-transparent w-full focus:outline-none text-sm" />
            </Field>
          )}
          <Field icon={<Mail className="w-4 h-4" />}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일"
              className="bg-transparent w-full focus:outline-none text-sm" />
          </Field>
          <Field icon={<Lock className="w-4 h-4" />}>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호 (6자 이상)"
              className="bg-transparent w-full focus:outline-none text-sm" />
          </Field>
        </div>

        <button onClick={submit} disabled={busy}
          className="mt-5 w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? "처리 중..." : (<>{mode==="login"?"로그인":"가입하기"} <ArrowRight className="w-4 h-4" /></>)}
        </button>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          금융급 RLS · 원자성 트랜잭션 · 이중기장 원장
        </p>
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
