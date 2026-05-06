import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useDB, uid } from "@/lib/store";
import Particles from "@/components/Particles";
import { Mail, Lock, User as UserIcon, Phone, Calendar, Hash, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("signup") ? "signup" : "login");
  const [, setDb] = useDB();
  const nav = useNavigate();
  const [form, setForm] = useState({
    nickname: "", email: "", password: "",
    phone: "", phoneCode: "", realName: "", birth: "", referralCode: "",
  });
  const [phoneSent, setPhoneSent] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function login() {
    if (!form.email || !form.password) { toast({ title: "이메일과 비밀번호를 입력해주세요" }); return; }
    setDb(d => {
      const existing = d.users.find(u => u.email === form.email);
      const isAdmin = form.email === "admin@phonemission.kr";
      const user = existing || {
        id: uid(), nickname: form.email.split("@")[0], email: form.email, phone: "", realName: "", birth: "",
        balance: 50000, coinBalance: 0, todayEarnings: 0, streak: 1, level: 1, xp: 120, tier: "NORMAL" as const, isAdmin,
      };
      if (isAdmin) user.isAdmin = true;
      return { ...d, user, users: existing ? d.users : [...d.users, user] };
    });
    toast({ title: "환영합니다 ✨", description: "사이버 수익 여정이 시작됩니다." });
    nav("/dashboard");
  }

  function checkAge(birth: string) {
    if (!birth) return false;
    const d = new Date(birth);
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 14;
  }

  function signup() {
    if (!form.nickname || !form.email || !form.password || !form.phone || !form.realName || !form.birth) {
      toast({ title: "모든 필수 항목을 입력해주세요" }); return;
    }
    if (!checkAge(form.birth)) { toast({ title: "만 14세 이상부터 가입 가능합니다", description: "청소년 보호를 위해 가입이 제한됩니다." }); return; }
    if (!phoneSent || form.phoneCode !== "0000") { toast({ title: "휴대폰 인증을 완료해주세요", description: "테스트 인증번호: 0000" }); return; }
    const user = {
      id: uid(), nickname: form.nickname, email: form.email, phone: form.phone,
      realName: form.realName, birth: form.birth, referralCode: form.referralCode,
      balance: 5000, coinBalance: 0, todayEarnings: 5000, streak: 1, level: 1, xp: 100, tier: "NORMAL" as const,
    };
    setDb(d => ({ ...d, user, users: [...d.users, user] }));
    toast({ title: "🎉 가입 완료!", description: "5,000원 신규 보너스가 지급되었습니다." });
    nav("/dashboard");
  }

  function social(provider: string) {
    const user = {
      id: uid(), nickname: provider + "유저", email: provider.toLowerCase() + "@user.kr", phone: "", realName: "", birth: "",
      balance: 50000, coinBalance: 0, todayEarnings: 0, streak: 1, level: 2, xp: 250, tier: "NORMAL" as const,
    };
    setDb(d => ({ ...d, user, users: [...d.users, user] }));
    toast({ title: `${provider} 로그인 성공` });
    nav("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-10 px-4">
      {/* Elegant ambient background — full coverage, no isolated orbs */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-aurora opacity-[0.08] animate-gradient" style={{ backgroundSize: "300% 300%" }} />
      <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[60vh] bg-[radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.18),transparent_60%)]" />
      <Particles density={45} />

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-display font-black text-primary-foreground">폰</div>
          <span className="font-display font-bold text-xl"><span className="text-gradient-primary">PHONE</span>MISSION</span>
        </Link>

        <div className="glass-strong rounded-3xl p-6 sm:p-8 neon-border relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-primary blur-3xl opacity-40" />

          <div className="relative">
            <div className="flex bg-muted/40 rounded-xl p-1 mb-6">
              {(["login", "signup"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${mode === m ? "bg-gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground"}`}>
                  {m === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>

            <h1 className="font-display font-black text-2xl">
              {mode === "login" ? <>다시 만나서 <span className="text-gradient-primary">반가워요</span></> : <>3분 만에 <span className="text-gradient-cyber">시작</span>합니다</>}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "login" ? "로그인하고 오늘의 보상을 받으세요" : "가입 즉시 5,000원 보너스가 자동 지급됩니다"}
            </p>

            {/* Social */}
            <div className="grid grid-cols-3 gap-2 mt-6">
              <button onClick={() => social("Kakao")} className="py-3 rounded-xl bg-[#FEE500] text-black font-bold text-sm hover:scale-105 transition">카카오</button>
              <button onClick={() => social("Google")} className="py-3 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition">Google</button>
              <button onClick={() => social("Apple")} className="py-3 rounded-xl bg-black text-white font-bold text-sm hover:scale-105 transition">Apple</button>
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground tracking-widest">또는 이메일</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-3">
              {mode === "signup" && (
                <Field icon={UserIcon} placeholder="닉네임 (다른 유저에게 표시됩니다)" value={form.nickname} onChange={v => set("nickname", v)} />
              )}
              <Field icon={Mail} type="email" placeholder="이메일 주소" value={form.email} onChange={v => set("email", v)} />
              <Field icon={Lock} type="password" placeholder="비밀번호 (8자 이상)" value={form.password} onChange={v => set("password", v)} />

              {mode === "signup" && (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1"><Field icon={Phone} placeholder="휴대폰 번호 ('-' 없이)" value={form.phone} onChange={v => set("phone", v)} /></div>
                    <button onClick={() => { setPhoneSent(true); toast({ title: "인증번호 발송", description: "테스트: 0000" }); }}
                      className="px-3 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:scale-105 transition whitespace-nowrap">
                      인증요청
                    </button>
                  </div>
                  {phoneSent && (
                    <Field icon={ShieldCheck} placeholder="인증번호 4자리 (테스트: 0000)" value={form.phoneCode} onChange={v => set("phoneCode", v)} />
                  )}
                  <Field icon={UserIcon} placeholder="실명 (정산을 위해 필요)" value={form.realName} onChange={v => set("realName", v)} />
                  <Field icon={Calendar} type="date" placeholder="생년월일" value={form.birth} onChange={v => set("birth", v)} />
                  <Field icon={Hash} placeholder="추천인 코드 (선택)" value={form.referralCode} onChange={v => set("referralCode", v)} />
                  <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
                    가입 시 <span className="text-foreground">이용약관</span> 및 <span className="text-foreground">개인정보처리방침</span>에 동의한 것으로 간주됩니다. 모든 정보는 256bit 암호화되어 안전하게 보관됩니다.
                  </p>
                </>
              )}

              <button
                onClick={mode === "login" ? login : signup}
                className="w-full py-4 rounded-xl font-display font-bold bg-gradient-primary text-primary-foreground glow-primary hover:scale-[1.02] transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {mode === "login" ? "로그인하고 보상받기" : "가입하고 5,000원 받기"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-4">
          관리자 테스트: <span className="text-primary">admin@phonemission.kr</span> / 아무 비밀번호
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, ...p }: any) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        {...p}
        onChange={e => p.onChange(e.target.value)}
        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-input/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-input transition"
      />
    </div>
  );
}
