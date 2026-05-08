import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [bankName, setBankName] = useState("KB국민");
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
        toast({ title: "📊 일일 한도 도달", description: `오늘 한도 ${fmtKRW(cfg.daily_cap)}을 모두 사용했습니다.` });
      } else {
        toast({ title: "❌ 아쉽네요", description: "스트릭이 초기화되었습니다." });
      }
    } catch (e: any) {
      toast({ title: "정산 오류", description: humanizeError(e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function submitWithdraw() {
    if (!userId || busy) return;
    const a = Number(amount);
    if (!a || a < cfg.withdraw_min) { toast({ title: `${tier.toUpperCase()} 등급 최소 출금: ${fmtKRW(cfg.withdraw_min)}` }); return; }
    if (pin.length !== 6) { toast({ title: "출금 비밀번호 6자리를 입력하세요" }); return; }
    if (method === "bank" && !bankAccount) { toast({ title: "계좌번호를 입력해주세요" }); return; }
    if (method === "coin" && !coinAddress) { toast({ title: "코인 주소를 입력해주세요" }); return; }
    setBusy(true);
    try {
      const r = await requestWithdrawal({
        amount: a, method, pin,
        bankName: method === "bank" ? bankName : undefined,
        bankAccount: method === "bank" ? bankAccount : undefined,
        coinAddress: method === "coin" ? coinAddress : undefined,
        coinNetwork: method === "coin" ? coinNetwork : undefined,
      });
      toast({ title: "💸 출금 신청 완료", description: `거래코드: ${r.tx_code}` });
      setAmount(""); setPin(""); setBankAccount(""); setCoinAddress("");
      reload();
      fetchWithdrawals(userId).then(setWds);
    } catch (e: any) {
      toast({ title: "출금 실패", description: humanizeError(e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function logout() { await supabase.auth.signOut(); nav("/secure-auth"); }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
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
              {profile?.nickname ?? "회원"}
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
              <Stat label="Profit Share" value={fmtKRW(wallet?.profit_share_balance ?? 0)} icon={<Crown className="w-3 h-3" />} />
            </div>

            {/* Daily cap */}
            <div className="mt-5 pt-4 border-t border-border/40">
              <div className="flex justify-between text-[10px] mb-1.5">
                <span className="text-muted-foreground font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 오늘 적립 / 한도</span>
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
            { id: "play", label: "미션", icon: Zap },
            { id: "withdraw", label: "출금", icon: ArrowDownToLine },
            { id: "history", label: "내역", icon: Clock },
          ].map((t: any) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                tab===t.id ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* PLAY */}
        {tab === "play" && (
          <div className="mt-4 glass-strong rounded-3xl p-6 text-center neon-border">
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">MISSION ENGINE</div>
            <div className="font-display font-black text-xl mt-1">랜덤 정산 미션</div>
            <p className="text-xs text-muted-foreground mt-1">Win rate {(cfg.win[0]*100).toFixed(0)}~{(cfg.win[1]*100).toFixed(0)}% · Boost ×{tier === "normal" ? "1.0" : tier === "vip" ? "1.35" : tier === "god" ? "1.8" : "2.5"}</p>
            <button onClick={play} disabled={busy}
              className="mt-5 w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-display font-black text-lg glow-primary hover:scale-[1.02] active:scale-95 transition disabled:opacity-50">
              {busy ? "정산 중..." : "🎯 미션 실행"}
            </button>
            <p className="text-[10px] text-muted-foreground mt-3">DB 트랜잭션으로 원자적 정산 · 일일 한도 자동 적용</p>
          </div>
        )}

        {/* WITHDRAW */}
        {tab === "withdraw" && (
          <div className="mt-4 glass-strong rounded-3xl p-5 space-y-4 neon-border">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>setMethod("bank")} className={`p-3 rounded-xl text-left ${method==="bank"?"bg-gradient-primary text-primary-foreground glow-primary":"glass"}`}>
                <Banknote className="w-4 h-4" /><div className="text-xs font-bold mt-1">은행 출금</div>
              </button>
              <button onClick={()=>setMethod("coin")} className={`p-3 rounded-xl text-left ${method==="coin"?"bg-gradient-cyber text-black":"glass"}`}>
                <Coins className="w-4 h-4" /><div className="text-xs font-bold mt-1">코인 출금</div>
              </button>
            </div>

            <Field label={`금액 (최소 ${fmtKRW(cfg.withdraw_min)})`}>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={String(cfg.withdraw_min)}
                className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {[cfg.withdraw_min, cfg.withdraw_min*5, cfg.withdraw_min*10].map(v=>(
                <button key={v} onClick={()=>setAmount(String(v))} className="py-2 rounded-xl glass text-xs font-bold hover:bg-primary/10">+{v.toLocaleString()}</button>
              ))}
            </div>

            {method === "bank" ? (
              <>
                <Field label="은행"><select value={bankName} onChange={e=>setBankName(e.target.value)} className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm">
                  {["KB국민","신한","우리","하나","농협","카카오뱅크","토스뱅크"].map(b=><option key={b}>{b}</option>)}
                </select></Field>
                <Field label="계좌번호"><input value={bankAccount} onChange={e=>setBankAccount(e.target.value)} placeholder="'-' 없이"
                  className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm" /></Field>
              </>
            ) : (
              <>
                <Field label="네트워크"><select value={coinNetwork} onChange={e=>setCoinNetwork(e.target.value as any)} className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm">
                  {["TRC20","ERC20","BEP20"].map(b=><option key={b}>{b}</option>)}
                </select></Field>
                <Field label="수신 주소"><input value={coinAddress} onChange={e=>setCoinAddress(e.target.value)} placeholder="USDT 주소"
                  className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm font-mono" /></Field>
              </>
            )}

            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span className="text-xs font-display font-bold">출금 비밀번호 6자리</span>
              </div>
              <PinPad value={pin} onChange={setPin} label={profile?.withdraw_pin_hash ? "" : "(첫 입력 시 자동 등록)"} />
            </div>

            <WithdrawIntentInterceptor amount={Number(amount) || 0}>
              {(handle) => (
                <button
                  onClick={(e) => { handle(e); if (!e.defaultPrevented) void submitWithdraw(); }}
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary hover:scale-[1.02] transition disabled:opacity-50">
                  {busy ? "처리 중..." : "출금 신청"}
                </button>
              )}
            </WithdrawIntentInterceptor>
            <p className="text-[10px] text-muted-foreground text-center">
              {tier === "normal" && "1일 최대 3회 · "}처리 시간: {cfg.process_h < 1 ? `${cfg.process_h*60}분` : `${cfg.process_h}시간`} 이내
            </p>
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div className="mt-4 space-y-2">
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold mb-2">출금 요청</div>
            {wds.length === 0 && <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">출금 내역 없음</div>}
            {wds.map(w => (
              <div key={w.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">{w.method === "bank" ? `${w.bank_name} ${w.bank_account}` : `${w.coin_network} ${w.coin_address?.slice(0,12)}...`}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{w.tx_code}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString("ko-KR")}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-primary">-{fmtKRW(w.amount)}</div>
                  <div className={`text-[10px] font-bold ${w.status==="completed"?"text-secondary":w.status==="rejected"?"text-destructive":"text-gold"}`}>{w.status}</div>
                </div>
              </div>
            ))}

            <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold mb-2 mt-5">트랜잭션 원장</div>
            {txs.map(t => (
              <div key={t.id} className="glass rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">{t.kind}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("ko-KR")}</div>
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
