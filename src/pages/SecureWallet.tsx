import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useWallet } from "@/hooks/use-wallet";
import {
  TIER_CFG, fmtKRW, settleMission, requestWithdrawal, fetchTransactions,
  fetchWithdrawals, fetchProfile, rollWin, humanizeError, type Tier,
} from "@/lib/wallet";
import PinPad from "@/components/PinPad";
import { toast } from "@/hooks/use-toast";
import {
  Wallet as WalletIcon, ShieldCheck, ArrowDownToLine, ArrowUpFromLine,
  Clock, Sparkles, Zap, LogOut, Banknote, Coins, Flame, Crown, TrendingUp,
} from "lucide-react";
import WithdrawIntentInterceptor from "@/components/conversion/WithdrawIntentInterceptor";

type ActionTab = "play" | "withdraw" | "history";

export default function SecureWallet() {
  const { t, i18n } = useTranslation("secureWallet");
  const lng = (i18n.language || "ko").startsWith("en") ? "en" : "ko";
  const dtLocale = lng === "en" ? "en-US" : "ko-KR";
  const BANKS_SW = [
    { v: "KB", ko: "KB국민", en: "KB Kookmin" },
    { v: "Shinhan", ko: "신한", en: "Shinhan" },
    { v: "Woori", ko: "우리", en: "Woori" },
    { v: "Hana", ko: "하나", en: "Hana" },
    { v: "Nonghyup", ko: "농협", en: "Nonghyup" },
    { v: "Kakao Bank", ko: "카카오뱅크", en: "Kakao Bank" },
    { v: "Toss Bank", ko: "토스뱅크", en: "Toss Bank" },
  ];
  const { session, loading } = useSession();
  const nav = useNavigate();
  const userId = session?.user?.id;
  const { wallet, pulse, reload } = useWallet(userId);
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<ActionTab>("play");
  const [txs, setTxs] = useState<any[]>([]);
  const [wds, setWds] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastWin, setLastWin] = useState<{ amount: number; streak: number; mult: number } | null>(null);

  // withdraw form
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank" | "coin">("bank");
  const [bankName, setBankName] = useState(t("defaultBank"));
  const [bankAccount, setBankAccount] = useState("");
  const [coinAddress, setCoinAddress] = useState("");
  const [coinNetwork, setCoinNetwork] = useState<"TRC20" | "ERC20" | "BEP20">("TRC20");
  const [pin, setPin] = useState("");

  useEffect(() => { if (!loading && !session) nav("/secure-auth"); }, [loading, session, nav]);
  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId).then(setProfile);
    fetchTransactions(userId).then(setTxs);
    fetchWithdrawals(userId).then(setWds);
  }, [userId, pulse]);

  const tier: Tier = (profile?.tier ?? "normal") as Tier;
  const cfg = TIER_CFG[tier];
  const capPct = useMemo(() => Math.min(100, Math.round(((wallet?.today_earned ?? 0) / cfg.daily_cap) * 100)), [wallet, cfg]);

  async function play() {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const base = 1000 + Math.floor(Math.random() * 4000);
      const win = rollWin(tier);
      const r = await settleMission(`m_${Date.now()}`, base, win);
      if (r.is_win && r.final_reward > 0) {
        setLastWin({ amount: r.final_reward, streak: r.streak, mult: Number(r.multiplier) });
        toast({ title: `🎯 +${fmtKRW(r.final_reward)}`, description: `Streak ${r.streak}× · Mult ${r.multiplier.toFixed(2)}` });
      } else if (r.is_win && r.final_reward === 0) {
        toast({ title: t("capReached"), description: t("capReachedDesc", { cap: fmtKRW(cfg.daily_cap) }) });
      } else {
        toast({ title: t("missed"), description: t("missedDesc") });
      }
    } catch (e: any) {
      toast({ title: t("settleError"), description: humanizeError(e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function submitWithdraw() {
    if (!userId || busy) return;
    const a = Number(amount);
    if (!a || a < cfg.withdraw_min) { toast({ title: t("minWithdraw", { tier: tier.toUpperCase(), min: fmtKRW(cfg.withdraw_min) }) }); return; }
    if (pin.length !== 6) { toast({ title: t("pinRequired") }); return; }
    if (method === "bank" && !bankAccount) { toast({ title: t("bankRequired") }); return; }
    if (method === "coin" && !coinAddress) { toast({ title: t("coinRequired") }); return; }

    // Pre-check PIN lockout
    try {
      const { data: st } = await supabase.rpc("pin_lockout_status" as any, {});
      const s = st as any;
      if (s?.is_locked) {
        const until = s.locked_until ? new Date(s.locked_until).toLocaleString("ko-KR") : "-";
        toast({ title: "PIN 잠금 상태", description: `${until}까지 입력이 차단되었습니다.`, variant: "destructive" });
        return;
      }
    } catch (_) { /* non-fatal */ }

    setBusy(true);
    try {
      const r = await requestWithdrawal({
        amount: a, method, pin,
        bankName: method === "bank" ? bankName : undefined,
        bankAccount: method === "bank" ? bankAccount : undefined,
        coinAddress: method === "coin" ? coinAddress : undefined,
        coinNetwork: method === "coin" ? coinNetwork : undefined,
      });
      // success → reset fail counter
      try { await supabase.rpc("pin_record_attempt" as any, { _success: true }); } catch (_) {}
      toast({ title: t("withdrawDone"), description: t("withdrawDoneDesc", { code: r.tx_code }) });
      setAmount(""); setPin(""); setBankAccount(""); setCoinAddress("");
      reload();
      fetchWithdrawals(userId).then(setWds);
    } catch (e: any) {
      // If error message implies PIN mismatch, record fail
      const msg = String(e?.message ?? "");
      if (/pin|핀|비밀번호/i.test(msg)) {
        try {
          const { data: r2 } = await supabase.rpc("pin_record_attempt" as any, { _success: false });
          const rr = r2 as any;
          if (rr?.locked) {
            toast({ title: "🔒 PIN 24시간 잠금", description: "5회 오입력으로 24시간 잠금되었습니다.", variant: "destructive" });
            setBusy(false);
            return;
          }
          if (rr?.fail_count) {
            toast({ title: t("withdrawFail"), description: `${humanizeError(e)} (실패 ${rr.fail_count}/5)`, variant: "destructive" });
            setBusy(false);
            return;
          }
        } catch (_) {}
      }
      toast({ title: t("withdrawFail"), description: humanizeError(e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function logout() { await supabase.auth.signOut(); nav("/secure-auth"); }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("loading")}</div>;
  }

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="absolute -top-40 -left-20 w-[480px] h-[480px] bg-primary/15 blur-3xl blob" />
      <div className="absolute top-40 -right-20 w-[400px] h-[400px] bg-accent/15 blur-3xl blob" style={{ animationDelay: "-5s" }} />

      <div className="container relative pt-6 max-w-xl animate-liquid-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-secondary font-bold">
              <ShieldCheck className="w-3 h-3" /> SECURE WALLET v3
            </div>
            <h1 className="font-display font-black text-2xl text-gradient-primary mt-1">
              {profile?.nickname ?? t("memberFallback")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${
              tier === "empire" ? "bg-gradient-gold text-black" :
              tier === "god" ? "bg-gradient-cyber text-black" :
              tier === "vip" ? "bg-gradient-primary text-primary-foreground" :
              "glass text-muted-foreground"}`}>
              {tier === "empire" && <Crown className="w-3 h-3 inline mr-1" />}{cfg.label}
            </span>
            <button onClick={logout} className="p-2 rounded-lg glass text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Hero balance card */}
        <div className="relative glass-strong neon-border rounded-3xl p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-aurora opacity-10 animate-gradient" style={{ backgroundSize: "300% 300%" }} />
          <div className="relative">
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">AVAILABLE BALANCE</div>
            <div key={pulse} className="font-display font-black text-5xl text-money-strong tabular-nums mt-2 animate-liquid-in">
              {fmtKRW(wallet?.available_balance ?? 0)}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border/40">
              <Stat label="Total" value={fmtKRW(wallet?.total_balance ?? 0)} />
              <Stat label="Locked" value={fmtKRW(wallet?.locked_balance ?? 0)} icon={<Clock className="w-3 h-3" />} />
              <Stat label="Reward Pool" value={fmtKRW(wallet?.profit_share_balance ?? 0)} icon={<Crown className="w-3 h-3" />} />
            </div>

            {/* Daily cap */}
            <div className="mt-5 pt-4 border-t border-border/40">
              <div className="flex justify-between text-[10px] mb-1.5">
                <span className="text-muted-foreground font-bold flex items-center gap-1 break-keep"><TrendingUp className="w-3 h-3" /> {t("todayCap")}</span>
                <span className="font-bold tabular-nums">{fmtKRW(wallet?.today_earned ?? 0)} / {fmtKRW(cfg.daily_cap)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full bg-gradient-primary glow-primary transition-all duration-700" style={{ width: `${capPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Win popup */}
        {lastWin && (
          <div className="mt-4 glass-strong rounded-2xl p-4 neon-border flex items-center gap-3 animate-liquid-in">
            <Sparkles className="w-5 h-5 text-gold" />
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground font-bold">LAST WIN</div>
              <div className="font-display font-black text-xl text-gradient-gold">+{fmtKRW(lastWin.amount)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">streak</div>
              <div className="font-display font-bold text-secondary flex items-center gap-1"><Flame className="w-3 h-3 text-primary" />{lastWin.streak}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mt-5">
          {[
            { id: "play", label: t("tabPlay"), icon: Zap },
            { id: "withdraw", label: t("tabWithdraw"), icon: ArrowDownToLine },
            { id: "history", label: t("tabHistory"), icon: Clock },
          ].map((tb: any) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition press break-keep ${
                tab===tb.id ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"}`}>
              <tb.icon className="w-3.5 h-3.5" /> {tb.label}
            </button>
          ))}
        </div>

        {/* PLAY */}
        {tab === "play" && (
          <div className="mt-4 glass-strong rounded-3xl p-6 text-center neon-border">
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">MISSION ENGINE</div>
            <div className="font-display font-black text-xl mt-1 break-keep">{t("missionTitle")}</div>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">Win rate {(cfg.win[0]*100).toFixed(0)}~{(cfg.win[1]*100).toFixed(0)}% · Boost ×{tier === "normal" ? "1.0" : tier === "vip" ? "1.35" : tier === "god" ? "1.8" : "2.5"}</p>
            <button onClick={play} disabled={busy}
              className="mt-5 w-full min-h-[56px] py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-display font-black text-lg glow-primary hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 press">
              {busy ? t("settling") : t("runMission")}
            </button>
            <p className="text-[10px] text-muted-foreground mt-3 break-keep">{t("missionFooter")}</p>
          </div>
        )}

        {/* WITHDRAW */}
        {tab === "withdraw" && (
          <div className="mt-4 glass-strong rounded-3xl p-5 space-y-4 neon-border">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>setMethod("bank")} className={`min-h-[56px] p-3 rounded-xl text-left press ${method==="bank"?"bg-gradient-primary text-primary-foreground glow-primary":"glass"}`}>
                <Banknote className="w-4 h-4" /><div className="text-xs font-bold mt-1 break-keep">{t("bankWithdraw")}</div>
              </button>
              <button onClick={()=>setMethod("coin")} className={`min-h-[56px] p-3 rounded-xl text-left press ${method==="coin"?"bg-gradient-cyber text-black":"glass"}`}>
                <Coins className="w-4 h-4" /><div className="text-xs font-bold mt-1 break-keep">{t("coinWithdraw")}</div>
              </button>
            </div>

            <Field label={t("amountLabel", { min: fmtKRW(cfg.withdraw_min) })}>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={String(cfg.withdraw_min)}
                className="w-full min-h-[48px] bg-input/60 border border-border rounded-xl px-4 py-3 text-sm tabular-nums focus:outline-none focus:border-primary" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {[cfg.withdraw_min, cfg.withdraw_min*5, cfg.withdraw_min*10].map(v=>(
                <button key={v} onClick={()=>setAmount(String(v))} className="min-h-[44px] py-2 rounded-xl glass text-xs font-bold tabular-nums hover:bg-primary/10 press">+{v.toLocaleString()}</button>
              ))}
            </div>

            {method === "bank" ? (
              <>
                <Field label={t("bank")}><select value={bankName} onChange={e=>setBankName(e.target.value)} className="w-full min-h-[48px] bg-input/60 border border-border rounded-xl px-4 py-3 text-sm">
                  {BANKS_SW.map(b=><option key={b.v} value={b.v}>{b[lng]}</option>)}
                </select></Field>
                <Field label={t("account")}><input value={bankAccount} onChange={e=>setBankAccount(e.target.value)} placeholder={t("accountPh")}
                  className="w-full min-h-[48px] bg-input/60 border border-border rounded-xl px-4 py-3 text-sm tabular-nums" /></Field>
              </>
            ) : (
              <>
                <Field label={t("network")}><select value={coinNetwork} onChange={e=>setCoinNetwork(e.target.value as any)} className="w-full min-h-[48px] bg-input/60 border border-border rounded-xl px-4 py-3 text-sm">
                  {["TRC20","ERC20","BEP20"].map(b=><option key={b}>{b}</option>)}
                </select></Field>
                <Field label={t("coinAddrLabel")}><input value={coinAddress} onChange={e=>setCoinAddress(e.target.value)} placeholder={t("coinAddrPh")}
                  className="w-full min-h-[48px] bg-input/60 border border-border rounded-xl px-4 py-3 text-sm font-mono" /></Field>
              </>
            )}

            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span className="text-xs font-display font-bold break-keep">{t("pinTitle")}</span>
              </div>
              <PinPad value={pin} onChange={setPin} label={profile?.withdraw_pin_hash ? "" : t("pinFirst")} />
            </div>

            <WithdrawIntentInterceptor amount={Number(amount) || 0}>
              {(handle) => (
                <button
                  onClick={(e) => { handle(e); if (!e.defaultPrevented) void submitWithdraw(); }}
                  disabled={busy}
                  className="w-full min-h-[56px] py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary hover:scale-[1.02] transition disabled:opacity-50 press">
                  {busy ? t("processing") : t("submitWithdraw")}
                </button>
              )}
            </WithdrawIntentInterceptor>
            <p className="text-[10px] text-muted-foreground text-center break-keep">
              {tier === "normal" && t("capLine")}{t("processIn", { val: cfg.process_h < 1 ? t("minutes", { n: cfg.process_h*60 }) : t("hours", { n: cfg.process_h }) })}
            </p>
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div className="mt-4 space-y-2">
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold mb-2">{t("withdrawReq")}</div>
            {wds.length === 0 && <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">{t("withdrawEmpty")}</div>}
            {wds.map(w => (
              <div key={w.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">{w.method === "bank" ? `${w.bank_name} ${w.bank_account}` : `${w.coin_network} ${w.coin_address?.slice(0,12)}...`}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{w.tx_code}</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">{new Date(w.created_at).toLocaleString(dtLocale)}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-primary">-{fmtKRW(w.amount)}</div>
                  <div className={`text-[10px] font-bold ${w.status==="completed"?"text-secondary":w.status==="rejected"?"text-destructive":"text-gold"}`}>{w.status}</div>
                </div>
              </div>
            ))}

            <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold mb-2 mt-5">{t("txLedger")}</div>
            {txs.map(t => (
              <div key={t.id} className="glass rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">{t.kind}</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">{new Date(t.created_at).toLocaleString(dtLocale)}</div>
                </div>
                <div className={`font-display font-bold tabular-nums ${t.direction==="credit"?"text-secondary":"text-primary"}`}>
                  {t.direction==="credit"?"+":"-"}{fmtKRW(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return <div><div className="text-[11px] text-muted-foreground mb-1.5 font-bold">{label}</div>{children}</div>;
}
function Stat({ label, value, icon }: any) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.2em] text-muted-foreground font-bold flex items-center gap-1">{icon}{label}</div>
      <div className="font-display font-bold text-sm tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
