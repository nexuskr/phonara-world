import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, formatKRW } from "@/lib/store";
import { ShieldCheck, Star, Trophy, Settings, Award, Lock, X, Mail, KeyRound, BookOpen, LogOut, Crown, Flame, Wallet as WalletIcon, Sparkles, Target, Users, Zap } from "lucide-react";
import PinPad from "@/components/PinPad";
import PinResetDialog from "@/components/PinResetDialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";

type BadgeDef = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  got: boolean;
  progress?: number; // 0-100
};

import ReferralCard from "@/components/ReferralCard";

export default function Profile() {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const user = useRequireAuth() ?? db.user;
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  // Settings modals
  const [accountOpen, setAccountOpen] = useState(false);
  const [pinResetOpen, setPinResetOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const u = user;
  const xpToNext = u.level * 1000;
  const pct = Math.min(100, (u.xp / xpToNext) * 100);

  // ===== UPGRADED ACHIEVEMENT BADGES =====
  const badges: BadgeDef[] = [
    { id: "first",       name: "첫 발걸음",       emoji: "🚀", desc: "첫 미션 완료",          rarity: "common",    got: u.xp >= 100, progress: Math.min(100, u.xp) },
    { id: "vip",         name: "VIP 입성",        emoji: "💎", desc: "VIP 등급 달성",         rarity: "rare",      got: ["VIP","GOD","EMPIRE"].includes(u.tier) },
    { id: "god",         name: "GOD MODE",        emoji: "⚡", desc: "GOD 등급 달성",         rarity: "epic",      got: ["GOD","EMPIRE"].includes(u.tier) },
    { id: "empire",      name: "EMPIRE 군주",     emoji: "👑", desc: "EMPIRE 등급 달성",      rarity: "legendary", got: u.tier === "EMPIRE" },
    { id: "streak3",     name: "3일 연속",        emoji: "🌱", desc: "3일 연속 출석",         rarity: "common",    got: u.streak >= 3,  progress: Math.min(100, (u.streak/3)*100) },
    { id: "streak7",     name: "주간 챔피언",     emoji: "🔥", desc: "7일 연속 출석",         rarity: "rare",      got: u.streak >= 7,  progress: Math.min(100, (u.streak/7)*100) },
    { id: "streak30",    name: "월간 마스터",     emoji: "🏆", desc: "30일 연속 출석",        rarity: "epic",      got: u.streak >= 30, progress: Math.min(100, (u.streak/30)*100) },
    { id: "rich10",      name: "10만원 클럽",     emoji: "💵", desc: "잔고 10만원 돌파",      rarity: "common",    got: u.balance >= 100_000 },
    { id: "rich100",     name: "백만원 달성",     emoji: "💰", desc: "잔고 100만원 돌파",     rarity: "rare",      got: u.balance >= 1_000_000 },
    { id: "rich1000",    name: "천만 부호",       emoji: "💸", desc: "잔고 1,000만원 돌파",    rarity: "epic",      got: u.balance >= 10_000_000 },
    { id: "lvup10",      name: "성장하는 자",     emoji: "📈", desc: "Lv.10 달성",            rarity: "rare",      got: u.level >= 10 },
    { id: "lvup30",      name: "노련한 도전자",   emoji: "🎯", desc: "Lv.30 달성",            rarity: "epic",      got: u.level >= 30 },
    { id: "xp10k",       name: "경험의 정수",     emoji: "✨", desc: "누적 XP 10,000",        rarity: "rare",      got: u.xp >= 10_000 },
    { id: "earner",      name: "오늘의 사냥꾼",   emoji: "🎁", desc: "하루 5만원 적립",       rarity: "common",    got: u.todayEarnings >= 50_000 },
    { id: "phantom",     name: "PHANTOM 의결권",  emoji: "🛸", desc: "Syndicate Council",      rarity: "legendary", got: u.tier === "EMPIRE" && u.balance >= 50_000_000 },
  ];
  const earnedCount = badges.filter(b => b.got).length;

  const rarityCls = (r: BadgeDef["rarity"], got: boolean) => {
    if (!got) return "opacity-30 border-border";
    return r === "legendary" ? "border-gold bg-gradient-gold/10 shadow-neon-gold"
      : r === "epic"      ? "border-accent bg-accent/10 shadow-neon-purple"
      : r === "rare"      ? "border-primary bg-primary/10 shadow-neon-orange"
      : "border-secondary bg-secondary/5";
  };

  function savePw() {
    if (!/^\d{6}$/.test(pw) || pw !== pw2) { toast({ title: "6자리 숫자 일치 필요" }); return; }
    setDb(d => ({ ...d, user: d.user ? { ...d.user, withdrawPw: pw } : null }));
    setPw(""); setPw2(""); setPwOpen(false);
    toast({ title: "✅ 출금 비밀번호 저장됨" });
  }

  async function saveNickname() {
    const v = nickname.trim();
    if (v.length < 2 || v.length > 20) { toast({ title: "닉네임 2~20자", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ nickname: v }).eq("id", u.id);
      if (error) throw error;
      setDb(d => ({ ...d, user: d.user ? { ...d.user, nickname: v } : null }));
      toast({ title: "닉네임 변경 완료" });
      setAccountOpen(false);
    } catch (e: any) { toast({ title: "오류", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function changeEmail() {
    if (!/^.+@.+\..+/.test(newEmail)) { toast({ title: "이메일 형식 확인", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({ title: "확인 메일을 발송했습니다", description: "새 이메일에서 인증해주세요." });
      setEmailOpen(false); setNewEmail("");
    } catch (e: any) { toast({ title: "오류", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function changePass() {
    if (newPass.length < 8) { toast({ title: "비밀번호 8자 이상", variant: "destructive" }); return; }
    if (newPass !== newPass2) { toast({ title: "새 비밀번호 불일치", variant: "destructive" }); return; }
    setBusy(true);
    try {
      // Re-auth with current password for safety
      const { error: e1 } = await supabase.auth.signInWithPassword({ email: u.email, password: curPass });
      if (e1) throw new Error("현재 비밀번호가 일치하지 않습니다");
      const { error: e2 } = await supabase.auth.updateUser({ password: newPass });
      if (e2) throw e2;
      toast({ title: "비밀번호 변경 완료" });
      setPassOpen(false); setCurPass(""); setNewPass(""); setNewPass2("");
    } catch (e: any) { toast({ title: "오류", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function logout() {
    await supabase.auth.signOut();
    setDb(d => ({ ...d, user: null }));
    nav("/", { replace: true });
  }

  return (
    <Layout>
      <div className="container pt-6 pb-32 animate-liquid-in">
        {/* Hero */}
        <div className="glass-strong rounded-3xl p-6 neon-border relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-gradient-primary blur-3xl opacity-40" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-cyber flex items-center justify-center font-display font-black text-3xl text-foreground glow-primary">
                {u.nickname[0]?.toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-gold text-gold-foreground text-[10px] font-black">Lv.{u.level}</div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-black text-xl truncate">{u.nickname}</h2>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              <div className="text-[10px] text-gold font-bold mt-0.5 flex items-center gap-1"><Crown className="w-3 h-3" /> {u.tier} 등급</div>
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>XP {u.xp.toLocaleString()}</span><span>{xpToNext.toLocaleString()}</span>
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
            <Card icon={Flame} label="연속" v={`${u.streak}일`} />
          </div>
        </div>

        {/* ===== Phase 21: Referral System ===== */}
        <div className="mt-5">
          <ReferralCard />
        </div>

        {/* ===== Upgraded Badges ===== */}
        <div className="mt-5 glass-strong rounded-2xl p-4 neon-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm flex items-center gap-2"><Award className="w-4 h-4 text-gold" /> 업적 배지</h3>
            <span className="text-[10px] text-muted-foreground">{earnedCount}/{badges.length} 획득</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {badges.map(b => (
              <div key={b.id} className={`relative rounded-xl p-3 text-center border transition ${rarityCls(b.rarity, b.got)}`}>
                <div className="text-2xl">{b.emoji}</div>
                <div className="text-[10px] mt-1 font-bold leading-tight">{b.name}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{b.desc}</div>
                {!b.got && b.progress !== undefined && b.progress > 0 && (
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${b.progress}%` }} />
                  </div>
                )}
                {b.got && (
                  <div className="absolute top-1 right-1 text-[8px] font-black px-1 py-0.5 rounded-md bg-background/80">
                    {b.rarity === "legendary" ? "🌟" : b.rarity === "epic" ? "💜" : b.rarity === "rare" ? "🔶" : "⚪"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===== Settings ===== */}
        <div className="mt-5 space-y-2">
          <SectionTitle>계정 설정</SectionTitle>

          <Row icon={Settings} label="계정 설정" sub="닉네임 · 프로필 정보" onClick={() => { setNickname(u.nickname); setAccountOpen(true); }} />
          <Row icon={Mail} label="이메일 변경" sub={u.email} onClick={() => setEmailOpen(true)} />
          <Row icon={KeyRound} label="비밀번호 변경" sub="로그인 비밀번호" onClick={() => setPassOpen(true)} />
          <Row icon={Lock} label={`출금 PIN ${u.withdrawPw ? "변경" : "설정"}`} sub={u.withdrawPw ? "6자리 PIN 등록됨" : "출금 시 필요한 6자리 PIN"} onClick={() => setPwOpen(true)} statusGood={!!u.withdrawPw} />
          <Row icon={KeyRound} label="출금 PIN 재설정" sub="비밀번호 재인증 후 새 PIN 설정 (24시간 내 3회)" onClick={() => setPinResetOpen(true)} />

          <SectionTitle>안내</SectionTitle>
          <Link to="/guide" className="block">
            <Row icon={BookOpen} label="운영원칙 & 이용가이드" sub="등급 · 잭팟 · 충전/환전" />
          </Link>
          <Link to="/support" className="block">
            <Row icon={ShieldCheck} label="고객센터" sub="1:1 실시간 상담" />
          </Link>

          <button onClick={logout} className="w-full mt-3 glass rounded-2xl p-4 flex items-center gap-3 hover:bg-destructive/10 transition text-left">
            <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center"><LogOut className="w-4 h-4 text-destructive" /></div>
            <div className="flex-1">
              <div className="text-sm font-bold text-destructive">로그아웃</div>
              <div className="text-[10px] text-muted-foreground">현재 기기에서 로그아웃합니다</div>
            </div>
          </button>
        </div>
      </div>

      {pinResetOpen && <PinResetDialog email={u.email} onClose={() => setPinResetOpen(false)} />}

      {/* PIN modal */}
      {pwOpen && (
        <Modal title="출금 비밀번호 설정" onClose={() => setPwOpen(false)} icon={<Lock className="w-4 h-4 text-primary" />}>
          <p className="text-[11px] text-muted-foreground -mt-2">출금 시 입력하는 6자리 PIN</p>
          <PinPad value={pw} onChange={setPw} label="새 PIN 6자리" />
          <PinPad value={pw2} onChange={setPw2} label="PIN 재입력" />
          <PrimaryButton onClick={savePw}>저장</PrimaryButton>
        </Modal>
      )}

      {/* Account (nickname) modal */}
      {accountOpen && (
        <Modal title="계정 설정" onClose={() => setAccountOpen(false)} icon={<Settings className="w-4 h-4 text-primary" />}>
          <Label>닉네임 (2~20자)</Label>
          <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20} className="w-full px-4 py-3 rounded-xl glass border border-border focus:border-primary text-sm" />
          <PrimaryButton onClick={saveNickname} disabled={busy}>{busy ? "저장 중..." : "저장"}</PrimaryButton>
        </Modal>
      )}

      {/* Email change modal */}
      {emailOpen && (
        <Modal title="이메일 변경" onClose={() => setEmailOpen(false)} icon={<Mail className="w-4 h-4 text-primary" />}>
          <p className="text-[11px] text-muted-foreground -mt-2">새 이메일로 인증 링크가 발송됩니다.</p>
          <Label>현재 이메일</Label>
          <div className="px-4 py-3 rounded-xl glass border border-border text-sm text-muted-foreground">{u.email}</div>
          <Label>새 이메일</Label>
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" className="w-full px-4 py-3 rounded-xl glass border border-border focus:border-primary text-sm" />
          <PrimaryButton onClick={changeEmail} disabled={busy}>{busy ? "처리 중..." : "변경 요청"}</PrimaryButton>
        </Modal>
      )}

      {/* Password change modal */}
      {passOpen && (
        <Modal title="비밀번호 변경" onClose={() => setPassOpen(false)} icon={<KeyRound className="w-4 h-4 text-primary" />}>
          <Label>현재 비밀번호</Label>
          <input type="password" value={curPass} onChange={e => setCurPass(e.target.value)} className="w-full px-4 py-3 rounded-xl glass border border-border focus:border-primary text-sm" />
          <Label>새 비밀번호 (8자 이상)</Label>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-4 py-3 rounded-xl glass border border-border focus:border-primary text-sm" />
          <Label>새 비밀번호 확인</Label>
          <input type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} className="w-full px-4 py-3 rounded-xl glass border border-border focus:border-primary text-sm" />
          <PrimaryButton onClick={changePass} disabled={busy}>{busy ? "처리 중..." : "변경"}</PrimaryButton>
        </Modal>
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

function Row({ icon: Icon, label, sub, onClick, statusGood }: any) {
  return (
    <button onClick={onClick} className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-muted/30 transition text-left">
      <div className="w-10 h-10 rounded-xl bg-gradient-primary/20 flex items-center justify-center"><Icon className="w-4 h-4 text-primary" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
      </div>
      {statusGood !== undefined && (
        <span className={`text-[10px] font-bold ${statusGood ? "text-secondary" : "text-gold"}`}>{statusGood ? "활성" : "미설정"}</span>
      )}
    </button>
  );
}

function SectionTitle({ children }: any) {
  return <div className="text-[10px] tracking-widest text-muted-foreground font-bold mt-4 mb-1 px-1">{children}</div>;
}

function Label({ children }: any) {
  return <div className="text-[11px] text-muted-foreground font-bold mt-2 px-1">{children}</div>;
}

function PrimaryButton({ children, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className="w-full mt-2 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-50">
      {children}
    </button>
  );
}

function Modal({ title, onClose, icon, children }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative animate-fade-up space-y-3">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"><X className="w-4 h-4" /></button>
        <h2 className="font-display font-black text-lg flex items-center gap-2">{icon} {title}</h2>
        {children}
      </div>
    </div>
  );
}
