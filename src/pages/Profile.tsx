import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, formatKRW } from "@/lib/store";
import { ShieldCheck, Star, Trophy, Settings, Award, Lock, X } from "lucide-react";
import PinPad from "@/components/PinPad";
import { toast } from "@/hooks/use-toast";

export default function Profile() {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  if (!db.user) { nav("/auth"); return null; }
  const u = db.user;
  const xpToNext = u.level * 1000;
  const pct = Math.min(100, (u.xp / xpToNext) * 100);

  const badges = [
    { id: "first", name: "첫 미션", emoji: "🚀", got: u.xp >= 100 },
    { id: "vip", name: "VIP 입성", emoji: "👑", got: u.tier !== "NORMAL" },
    { id: "streak7", name: "7일 연속", emoji: "🔥", got: u.streak >= 7 },
    { id: "millionaire", name: "백만원", emoji: "💰", got: u.balance >= 1_000_000 },
  ];

  function savePw() {
    if (!/^\d{6}$/.test(pw) || pw !== pw2) { toast({ title: "6자리 숫자 일치 필요" }); return; }
    setDb(d => ({ ...d, user: d.user ? { ...d.user, withdrawPw: pw } : null }));
    setPw(""); setPw2(""); setPwOpen(false);
    toast({ title: "✅ 출금 비밀번호 저장됨" });
  }

  return (
    <Layout>
      <div className="container pt-6 pb-10">
        <div className="glass-strong rounded-3xl p-6 neon-border relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-gradient-primary blur-3xl opacity-40" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-cyber flex items-center justify-center font-display font-black text-3xl text-foreground glow-primary">
                {u.nickname[0]?.toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-gold text-gold-foreground text-[10px] font-black">Lv.{u.level}</div>
            </div>
            <div className="flex-1">
              <h2 className="font-display font-black text-xl">{u.nickname}</h2>
              <p className="text-xs text-muted-foreground">{u.email}</p>
              <div className="text-[10px] text-gold font-bold mt-0.5">{u.tier} 등급</div>
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>XP {u.xp}</span><span>{xpToNext}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary glow-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-2 mt-5">
            <Card icon={Trophy} label="잔고" v={formatKRW(u.balance)} />
            <Card icon={Star} label="오늘" v={formatKRW(u.todayEarnings)} />
            <Card icon={Award} label="연속" v={`${u.streak}일`} />
          </div>
        </div>

        {/* Badges */}
        <div className="mt-5 glass-strong rounded-2xl p-4 neon-border">
          <h3 className="font-display font-bold text-sm flex items-center gap-2"><Award className="w-4 h-4 text-gold" /> 업적 배지</h3>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {badges.map(b => (
              <div key={b.id} className={`glass rounded-xl p-3 text-center ${b.got ? "" : "opacity-30"}`}>
                <div className="text-2xl">{b.emoji}</div>
                <div className="text-[10px] mt-1 font-bold">{b.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="mt-5 space-y-2">
          <button onClick={() => setPwOpen(true)} className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-muted/30 transition text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary/20 flex items-center justify-center"><Lock className="w-4 h-4 text-primary" /></div>
            <div className="flex-1">
              <div className="text-sm font-bold">출금 비밀번호 {u.withdrawPw ? "변경" : "설정"}</div>
              <div className="text-[10px] text-muted-foreground">{u.withdrawPw ? "6자리 PIN 등록됨" : "출금 시 필요한 6자리 PIN"}</div>
            </div>
            <span className={`text-[10px] font-bold ${u.withdrawPw ? "text-secondary" : "text-gold"}`}>{u.withdrawPw ? "활성" : "미설정"}</span>
          </button>
          {[
            { icon: ShieldCheck, label: "본인 인증", sub: "휴대폰 · 실명 확인", v: "완료" },
            { icon: Settings, label: "계정 설정", sub: "알림 · 프로필", v: "" },
          ].map((m, i) => (
            <div key={i} className="w-full glass rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary/20 flex items-center justify-center"><m.icon className="w-4 h-4 text-primary" /></div>
              <div className="flex-1">
                <div className="text-sm font-bold">{m.label}</div>
                <div className="text-[10px] text-muted-foreground">{m.sub}</div>
              </div>
              {m.v && <span className="text-[10px] text-secondary font-bold">{m.v}</span>}
            </div>
          ))}
        </div>
      </div>

      {pwOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative animate-fade-up">
            <button onClick={() => setPwOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"><X className="w-4 h-4" /></button>
            <h2 className="font-display font-black text-lg flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> 출금 비밀번호 설정</h2>
            <p className="text-[11px] text-muted-foreground mt-1">출금 및 충전 시 입력하는 6자리 PIN</p>
            <div className="mt-4 space-y-4">
              <PinPad value={pw} onChange={setPw} label="새 PIN 6자리" />
              <PinPad value={pw2} onChange={setPw2} label="PIN 재입력" />
              <button onClick={savePw} className="w-full py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary">저장</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Card({ icon: Icon, label, v }: any) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <Icon className="w-4 h-4 mx-auto text-primary" />
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
      <div className="font-display font-bold text-xs">{v}</div>
    </div>
  );
}
