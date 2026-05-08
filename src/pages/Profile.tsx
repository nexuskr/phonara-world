import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { useDB, formatKRW } from "@/lib/store";
import { ShieldCheck, Star, Trophy, Settings, Award, Lock, X, Mail, KeyRound, BookOpen, LogOut, Crown, Flame } from "lucide-react";
import PinPad from "@/components/PinPad";
import PinResetDialog from "@/components/PinResetDialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { LuxButton, LuxInput } from "@/components/ui/lux";

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
import CoinMasterLounge from "@/components/CoinMasterLounge";

export default function Profile() {
  const { t } = useTranslation("profile");
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
    { id: "first",    name: t("badges.first.name"),    emoji: "🚀", desc: t("badges.first.desc"),    rarity: "common",    got: u.xp >= 100, progress: Math.min(100, u.xp) },
    { id: "vip",      name: t("badges.vip.name"),      emoji: "💎", desc: t("badges.vip.desc"),      rarity: "rare",      got: ["VIP","GOD","EMPIRE"].includes(u.tier) },
    { id: "god",      name: t("badges.god.name"),      emoji: "⚡", desc: t("badges.god.desc"),      rarity: "epic",      got: ["GOD","EMPIRE"].includes(u.tier) },
    { id: "empire",   name: t("badges.empire.name"),   emoji: "👑", desc: t("badges.empire.desc"),   rarity: "legendary", got: u.tier === "EMPIRE" },
    { id: "streak3",  name: t("badges.streak3.name"),  emoji: "🌱", desc: t("badges.streak3.desc"),  rarity: "common",    got: u.streak >= 3,  progress: Math.min(100, (u.streak/3)*100) },
    { id: "streak7",  name: t("badges.streak7.name"),  emoji: "🔥", desc: t("badges.streak7.desc"),  rarity: "rare",      got: u.streak >= 7,  progress: Math.min(100, (u.streak/7)*100) },
    { id: "streak30", name: t("badges.streak30.name"), emoji: "🏆", desc: t("badges.streak30.desc"), rarity: "epic",      got: u.streak >= 30, progress: Math.min(100, (u.streak/30)*100) },
    { id: "rich10",   name: t("badges.rich10.name"),   emoji: "💵", desc: t("badges.rich10.desc"),   rarity: "common",    got: u.balance >= 100_000 },
    { id: "rich100",  name: t("badges.rich100.name"),  emoji: "💰", desc: t("badges.rich100.desc"),  rarity: "rare",      got: u.balance >= 1_000_000 },
    { id: "rich1000", name: t("badges.rich1000.name"), emoji: "💸", desc: t("badges.rich1000.desc"), rarity: "epic",      got: u.balance >= 10_000_000 },
    { id: "lvup10",   name: t("badges.lvup10.name"),   emoji: "📈", desc: t("badges.lvup10.desc"),   rarity: "rare",      got: u.level >= 10 },
    { id: "lvup30",   name: t("badges.lvup30.name"),   emoji: "🎯", desc: t("badges.lvup30.desc"),   rarity: "epic",      got: u.level >= 30 },
    { id: "xp10k",    name: t("badges.xp10k.name"),    emoji: "✨", desc: t("badges.xp10k.desc"),    rarity: "rare",      got: u.xp >= 10_000 },
    { id: "earner",   name: t("badges.earner.name"),   emoji: "🎁", desc: t("badges.earner.desc"),   rarity: "common",    got: u.todayEarnings >= 50_000 },
    { id: "phantom",  name: t("badges.phantom.name"),  emoji: "🛸", desc: t("badges.phantom.desc"),  rarity: "legendary", got: u.tier === "EMPIRE" && u.balance >= 50_000_000 },
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
    if (!/^\d{6}$/.test(pw) || pw !== pw2) { toast({ title: t("pinErrMatch") }); return; }
    setDb(d => ({ ...d, user: d.user ? { ...d.user, withdrawPw: pw } : null }));
    setPw(""); setPw2(""); setPwOpen(false);
    toast({ title: t("pinSaved") });
  }

  async function saveNickname() {
    const v = nickname.trim();
    if (v.length < 2 || v.length > 20) { toast({ title: t("accNickErr"), variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ nickname: v }).eq("id", u.id);
      if (error) throw error;
      setDb(d => ({ ...d, user: d.user ? { ...d.user, nickname: v } : null }));
      toast({ title: t("accNickDone") });
      setAccountOpen(false);
    } catch (e: any) { toast({ title: t("genericError"), description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function changeEmail() {
    if (!/^.+@.+\..+/.test(newEmail)) { toast({ title: t("emailErrFmt"), variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({ title: t("emailSent"), description: t("emailSentDesc") });
      setEmailOpen(false); setNewEmail("");
    } catch (e: any) { toast({ title: t("genericError"), description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function changePass() {
    if (newPass.length < 8) { toast({ title: t("passErrShort"), variant: "destructive" }); return; }
    if (newPass !== newPass2) { toast({ title: t("passErrMismatch"), variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error: e1 } = await supabase.auth.signInWithPassword({ email: u.email, password: curPass });
      if (e1) throw new Error(t("passErrCurrent"));
      const { error: e2 } = await supabase.auth.updateUser({ password: newPass });
      if (e2) throw e2;
      toast({ title: t("passDone") });
      setPassOpen(false); setCurPass(""); setNewPass(""); setNewPass2("");
    } catch (e: any) { toast({ title: t("genericError"), description: e.message, variant: "destructive" }); }
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
              <div className="w-20 h-20 rounded-2xl bg-gradient-cyber flex items-center justify-center font-imperial font-black text-3xl text-foreground glow-primary">
                {u.nickname[0]?.toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-gold text-gold-foreground text-[10px] font-black tabular-nums">Lv.{u.level}</div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-imperial font-black text-xl sm:text-2xl truncate tracking-[0.02em]">{u.nickname}</h2>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              <div className="text-[10px] text-gold font-bold mt-0.5 flex items-center gap-1"><Crown className="w-3 h-3 shrink-0" /> {t("tier", { t: u.tier })}</div>
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1 tabular-nums">
                  <span>XP {u.xp.toLocaleString()}</span><span>{xpToNext.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary glow-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-2 mt-5">
            <Card icon={Trophy} label={t("cardBalance")} v={formatKRW(u.balance)} money />
            <Card icon={Star} label={t("cardToday")} v={formatKRW(u.todayEarnings)} money />
            <Card icon={Flame} label={t("cardStreak")} v={t("streakDays", { n: u.streak })} />
          </div>
        </div>

        {/* ===== Phase 21: Referral System ===== */}
        <div className="mt-5">
          <ReferralCard />
          <CoinMasterLounge />
        </div>

        {/* ===== Upgraded Badges ===== */}
        <div className="mt-5 glass-strong rounded-2xl p-4 neon-border">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="font-imperial font-bold text-sm flex items-center gap-2 tracking-[0.04em]"><Award className="w-4 h-4 text-gold" /> {t("badgesTitle")}</h3>
            <span className="text-[10px] text-muted-foreground tabular-nums">{t("badgesGot", { a: earnedCount, b: badges.length })}</span>
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
          <SectionTitle>{t("sectionAccount")}</SectionTitle>

          <Row icon={Settings} label={t("rowAccount")} sub={t("rowAccountSub")} onClick={() => { setNickname(u.nickname); setAccountOpen(true); }} />
          <Row icon={Mail} label={t("rowEmail")} sub={u.email} onClick={() => setEmailOpen(true)} />
          <Row icon={KeyRound} label={t("rowPass")} sub={t("rowPassSub")} onClick={() => setPassOpen(true)} />
          <Row icon={Lock} label={u.withdrawPw ? t("rowPinChange") : t("rowPinSet")} sub={u.withdrawPw ? t("rowPinSubActive") : t("rowPinSubInactive")} onClick={() => setPwOpen(true)} statusGood={!!u.withdrawPw} statusActive={t("statusActive")} statusInactive={t("statusInactive")} />
          <Row icon={KeyRound} label={t("rowPinReset")} sub={t("rowPinResetSub")} onClick={() => setPinResetOpen(true)} />

          <SectionTitle>{t("sectionGuide")}</SectionTitle>
          <Link to="/guide" className="block">
            <Row icon={BookOpen} label={t("rowGuide")} sub={t("rowGuideSub")} />
          </Link>
          <Link to="/support" className="block">
            <Row icon={ShieldCheck} label={t("rowSupport")} sub={t("rowSupportSub")} />
          </Link>

          <button onClick={logout} className="w-full mt-3 glass rounded-2xl p-4 flex items-center gap-3 hover:bg-destructive/10 transition text-left min-h-[64px]">
            <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center"><LogOut className="w-4 h-4 text-destructive" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-destructive break-keep">{t("rowLogout")}</div>
              <div className="text-[10px] text-muted-foreground break-keep">{t("rowLogoutSub")}</div>
            </div>
          </button>
        </div>
      </div>

      {pinResetOpen && <PinResetDialog email={u.email} onClose={() => setPinResetOpen(false)} />}

      {/* PIN modal */}
      {pwOpen && (
        <Modal title={t("pinTitle")} onClose={() => setPwOpen(false)} icon={<Lock className="w-4 h-4 text-primary" />}>
          <p className="text-[11px] text-muted-foreground -mt-2 break-keep">{t("pinSub")}</p>
          <PinPad value={pw} onChange={setPw} label={t("pinNew")} />
          <PinPad value={pw2} onChange={setPw2} label={t("pinConfirm")} />
          <LuxButton onClick={savePw} block size="lg" className="mt-2">{t("pinSave")}</LuxButton>
        </Modal>
      )}

      {accountOpen && (
        <Modal title={t("accTitle")} onClose={() => setAccountOpen(false)} icon={<Settings className="w-4 h-4 text-primary" />}>
          <Label>{t("accNicknameLabel")}</Label>
          <LuxInput value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20} />
          <LuxButton onClick={saveNickname} disabled={busy} block size="lg" className="mt-2">{busy ? t("accSaving") : t("accSave")}</LuxButton>
        </Modal>
      )}

      {emailOpen && (
        <Modal title={t("emailTitle")} onClose={() => setEmailOpen(false)} icon={<Mail className="w-4 h-4 text-primary" />}>
          <p className="text-[11px] text-muted-foreground -mt-2 break-keep">{t("emailSub")}</p>
          <Label>{t("emailCurrent")}</Label>
          <div className="px-4 py-3 rounded-2xl glass border border-border text-sm text-muted-foreground min-h-[48px] flex items-center">{u.email}</div>
          <Label>{t("emailNew")}</Label>
          <LuxInput type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" />
          <LuxButton onClick={changeEmail} disabled={busy} block size="lg" className="mt-2">{busy ? t("emailProcessing") : t("emailRequest")}</LuxButton>
        </Modal>
      )}

      {passOpen && (
        <Modal title={t("passTitle")} onClose={() => setPassOpen(false)} icon={<KeyRound className="w-4 h-4 text-primary" />}>
          <Label>{t("passCur")}</Label>
          <LuxInput type="password" value={curPass} onChange={e => setCurPass(e.target.value)} />
          <Label>{t("passNew")}</Label>
          <LuxInput type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
          <Label>{t("passNewConfirm")}</Label>
          <LuxInput type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} />
          <LuxButton onClick={changePass} disabled={busy} block size="lg" className="mt-2">{busy ? t("passProcessing") : t("passSubmit")}</LuxButton>
        </Modal>
      )}
    </Layout>
  );
}

function Card({ icon: Icon, label, v, money }: any) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <Icon className="w-4 h-4 mx-auto text-primary" />
      <div className="text-[10px] text-muted-foreground mt-1 break-keep">{label}</div>
      <div className={`font-imperial font-bold text-xs tabular-nums ${money ? "text-money-strong" : ""}`}>{v}</div>
    </div>
  );
}

function Row({ icon: Icon, label, sub, onClick, statusGood, statusActive, statusInactive }: any) {
  return (
    <button onClick={onClick} className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-muted/30 transition text-left min-h-[64px]">
      <div className="w-10 h-10 rounded-xl bg-gradient-primary/20 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold break-keep">{label}</div>
        <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
      </div>
      {statusGood !== undefined && (
        <span className={`text-[10px] font-bold ${statusGood ? "text-secondary" : "text-gold"}`}>{statusGood ? (statusActive ?? "") : (statusInactive ?? "")}</span>
      )}
    </button>
  );
}

function SectionTitle({ children }: any) {
  return <div className="text-[10px] tracking-widest text-muted-foreground font-bold mt-4 mb-1 px-1 uppercase">{children}</div>;
}

function Label({ children }: any) {
  return <div className="text-[11px] text-muted-foreground font-bold mt-2 px-1">{children}</div>;
}

function Modal({ title, onClose, icon, children }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-5 sm:p-6 neon-border relative animate-fade-up space-y-3">
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center"><X className="w-4 h-4" /></button>
        <h2 className="font-imperial font-black text-lg sm:text-xl flex items-center gap-2 tracking-[0.04em]">{icon} {title}</h2>
        {children}
      </div>
    </div>
  );
}
