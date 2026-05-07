import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDB, formatKRW, uid, gen6, WITHDRAW_LIMITS } from "@/lib/store";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Clock, Coins, Banknote, Copy, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PinPad from "@/components/PinPad";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { supabase } from "@/integrations/supabase/client";
import { refreshWallet } from "@/lib/missions-rpc";

type AssetTab = "bank" | "coin";
type ActionTab = "withdraw" | "deposit" | "history";

export default function Wallet() {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const user = useRequireAuth() ?? db.user;
  const [asset, setAsset] = useState<AssetTab>("bank");
  const [action, setAction] = useState<ActionTab>("withdraw");

  useEffect(() => { void refreshWallet(); }, []);

  // shared
  const [amount, setAmount] = useState("");
  // bank
  const [bank, setBank] = useState("KB국민");
  const [account, setAccount] = useState("");
  // coin
  const [coinAddr, setCoinAddr] = useState("");
  const [network, setNetwork] = useState<"TRC20" | "ERC20" | "BEP20">("TRC20");
  // verification
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [withdrawPw, setWithdrawPw] = useState("");
  const [resultCode, setResultCode] = useState<string | null>(null);

  if (!user) return null;
  const u = user;

  function sendCode() {
    const c = gen6();
    setSentCode(c);
    toast({ title: "📲 인증번호 발송됨", description: `테스트용 인증번호: ${c}` });
  }

  function ensureWithdrawPw() {
    if (!u.withdrawPw) {
      const pw = prompt("출금 비밀번호 6자리를 새로 설정해주세요");
      if (pw && /^\d{6}$/.test(pw)) {
        setDb(d => ({ ...d, user: d.user ? { ...d.user, withdrawPw: pw } : null }));
        return pw;
      }
      toast({ title: "출금 비밀번호 6자리를 정확히 입력해주세요" });
      return null;
    }
    return u.withdrawPw;
  }

  async function submitWithdraw() {
    const a = Number(amount);
    if (!a || a < 10000) { toast({ title: "최소 10,000원부터 출금 가능" }); return; }
    const balance = asset === "bank" ? u.balance : u.coinBalance;
    if (a > balance) { toast({ title: "잔고가 부족합니다" }); return; }
    const limit = WITHDRAW_LIMITS[u.tier];
    if (limit !== -1 && a > limit) {
      toast({ title: `${u.tier} 등급 출금 한도 초과`, description: `현재 한도: ${formatKRW(limit)} · 패키지 업그레이드로 한도 상향` });
      return;
    }
    if (asset === "bank" && !account) { toast({ title: "계좌번호를 입력해주세요" }); return; }
    if (asset === "coin" && !coinAddr) { toast({ title: "코인 주소를 입력해주세요" }); return; }
    if (sentCode !== authCode) { toast({ title: "인증번호 불일치" }); return; }
    if (!/^\d{6}$/.test(withdrawPw)) { toast({ title: "출금 PIN 6자리를 입력해주세요" }); return; }

    // Server-authoritative withdrawal: validates PIN, locks funds, creates request
    const { data, error } = await supabase.rpc("request_withdrawal", {
      _amount: a,
      _method: asset === "bank" ? "bank" : "coin",
      _bank_name: asset === "bank" ? bank : null,
      _bank_account: asset === "bank" ? account : null,
      _coin_address: asset === "coin" ? coinAddr : null,
      _coin_network: asset === "coin" ? network : null,
      _pin: withdrawPw,
    });

    if (error) {
      const msg = error.message || "";
      const friendly = msg.includes("pin mismatch") ? "출금 PIN이 일치하지 않습니다."
        : msg.includes("below_min") ? "최소 출금 금액 미만입니다."
        : msg.includes("insufficient_funds") ? "잔고가 부족합니다."
        : msg.includes("daily_withdraw_limit") ? "일반 등급 일일 출금 3회 한도를 초과했습니다."
        : msg;
      toast({ title: "출금 실패", description: friendly, variant: "destructive" });
      return;
    }

    const r = data as any;
    setResultCode(r?.tx_code ?? null);

    // Mirror to local DB for UI continuity
    setDb(d => ({
      ...d,
      withdraws: [{
        id: uid(), userId: u.id, nickname: u.nickname, amount: a, method: asset,
        bank: asset === "bank" ? bank : undefined, account: asset === "bank" ? account : undefined,
        coinAddress: asset === "coin" ? coinAddr : undefined, network: asset === "coin" ? network : undefined,
        txCode: r?.tx_code ?? "", status: "pending", createdAt: Date.now(),
      }, ...d.withdraws],
    }));
    await refreshWallet();
    setAmount(""); setAccount(""); setCoinAddr(""); setSentCode(null); setAuthCode(""); setWithdrawPw("");
    toast({ title: "💸 출금 신청 완료", description: `${u.tier} 등급 처리 시간 내 정산됩니다.` });
  }

  function submitDeposit() {
    const a = Number(amount);
    if (!a || a < 10000) { toast({ title: "최소 10,000원부터 충전 가능" }); return; }
    if (sentCode !== authCode) { toast({ title: "인증번호 불일치" }); return; }
    const pw = ensureWithdrawPw();
    if (!pw) return;
    if (pw !== withdrawPw) { toast({ title: "출금 비밀번호 불일치" }); return; }
    const txCode = "DP-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    setDb(d => ({
      ...d,
      deposits: [{
        id: uid(), userId: u.id, nickname: u.nickname,
        packageId: "manual", packageName: asset === "bank" ? "은행 충전" : "코인 충전",
        amount: a, method: asset, txCode, status: "pending", createdAt: Date.now(),
      }, ...d.deposits],
    }));
    setResultCode(txCode);
    setAmount(""); setSentCode(null); setAuthCode(""); setWithdrawPw("");
    toast({ title: "충전 신청 완료", description: "송금 후 관리자 승인 시 즉시 적립됩니다." });
  }

  return (
    <Layout>
      <div className="container pt-6 pb-10 animate-liquid-in">
        <h1 className="font-display font-black text-2xl flex items-center gap-2 mb-1">
          <WalletIcon className="w-5 h-5 text-primary" /> <span className="text-gradient-primary">사이버 지갑</span>
        </h1>
        <div className="text-[11px] text-muted-foreground mb-3">
          <span className="text-gold font-bold">{u.tier}</span> 등급 출금 한도:{" "}
          <span className="font-bold text-foreground">
            {WITHDRAW_LIMITS[u.tier] === -1 ? "무제한 ∞" : formatKRW(WITHDRAW_LIMITS[u.tier])}
          </span>
        </div>

        {/* Asset switcher */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => setAsset("bank")} className={`p-4 rounded-2xl text-left ${asset === "bank" ? "glass-strong neon-border" : "glass"}`}>
            <Banknote className={`w-4 h-4 ${asset === "bank" ? "text-primary" : "text-muted-foreground"}`} />
            <div className="text-[10px] text-muted-foreground mt-2">뱅크 잔고</div>
            <div className="font-display font-black text-lg text-gradient-gold tabular-nums">{formatKRW(u.balance)}</div>
          </button>
          <button onClick={() => setAsset("coin")} className={`p-4 rounded-2xl text-left ${asset === "coin" ? "glass-strong neon-border" : "glass"}`}>
            <Coins className={`w-4 h-4 ${asset === "coin" ? "text-secondary" : "text-muted-foreground"}`} />
            <div className="text-[10px] text-muted-foreground mt-2">코인 잔고 (USDT)</div>
            <div className="font-display font-black text-lg text-gradient-cyber tabular-nums">{u.coinBalance.toLocaleString()} USDT</div>
          </button>
        </div>

        {/* Action tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "withdraw", label: "출금", icon: ArrowDownToLine },
            { id: "deposit", label: "충전", icon: ArrowUpFromLine },
            { id: "history", label: "내역", icon: Clock },
          ].map((t: any) => (
            <button key={t.id} onClick={() => { setAction(t.id); setResultCode(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${action === t.id ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {resultCode && (action === "withdraw" || action === "deposit") && (
          <div className="glass-strong rounded-2xl p-5 neon-border mb-4 text-center">
            <ShieldCheck className="w-7 h-7 text-secondary mx-auto" />
            <div className="text-xs text-muted-foreground mt-2">발급된 거래 코드</div>
            <div className="font-display font-black text-lg text-gradient-cyber mt-1">{resultCode}</div>
            <button onClick={() => { navigator.clipboard.writeText(resultCode); toast({ title: "복사됨" }); }} className="mt-2 text-[11px] text-primary inline-flex items-center gap-1"><Copy className="w-3 h-3" /> 코드 복사</button>
          </div>
        )}

        {action !== "history" && (
          <div className="glass-strong rounded-2xl p-5 space-y-4 neon-border">
            <Field label="금액">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10,000원 이상"
                className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {[10000, 50000, 100000].map(v => (
                <button key={v} onClick={() => setAmount(String(v))} className="py-2 rounded-xl glass text-xs font-bold hover:bg-primary/10">+{v.toLocaleString()}</button>
              ))}
            </div>

            {asset === "bank" && action === "withdraw" && (
              <>
                <Field label="은행">
                  <select value={bank} onChange={e => setBank(e.target.value)} className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm">
                    {["KB국민", "신한", "우리", "하나", "농협", "카카오뱅크", "토스뱅크"].map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="계좌번호">
                  <input value={account} onChange={e => setAccount(e.target.value)} placeholder="'-' 없이 숫자만"
                    className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                </Field>
              </>
            )}

            {asset === "bank" && action === "deposit" && (
              <div className="glass rounded-xl p-4 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">입금 은행</span><span className="font-bold">KB국민 123-456-78901234</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">예금주</span><span className="font-bold">(주)폰미션</span></div>
                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">송금 후 발급된 거래 코드를 입금자명에 포함해주세요.</p>
              </div>
            )}

            {asset === "coin" && action === "withdraw" && (
              <>
                <Field label="네트워크">
                  <select value={network} onChange={e => setNetwork(e.target.value as any)} className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm">
                    {["TRC20", "ERC20", "BEP20"].map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="수신 코인 주소">
                  <input value={coinAddr} onChange={e => setCoinAddr(e.target.value)} placeholder="USDT 주소"
                    className="w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary" />
                </Field>
              </>
            )}

            {asset === "coin" && action === "deposit" && (
              <div className="glass rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">네트워크</span><span className="font-bold">{db.coin.network}</span></div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">관리자 입금 주소</span>
                  <code className="font-mono text-[10px] break-all bg-muted/40 p-2 rounded-lg">{db.coin.address}</code>
                  <button onClick={() => { navigator.clipboard.writeText(db.coin.address); toast({ title: "주소 복사됨" }); }}
                    className="text-[11px] text-primary inline-flex items-center gap-1"><Copy className="w-3 h-3" /> 주소 복사</button>
                </div>
                {db.coin.qr && <img src={db.coin.qr} alt="QR" className="w-32 h-32 rounded-lg mx-auto" />}
                <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">송금 후 6자리 인증번호와 출금비밀번호 입력 후 거래코드를 발급받으세요.</p>
              </div>
            )}

            {/* Verification block */}
            <div className="glass rounded-xl p-4 space-y-3 border border-border/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span className="text-xs font-display font-bold">금융급 2단계 인증</span>
              </div>
              {!sentCode ? (
                <button onClick={sendCode} className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:scale-[1.02] transition">
                  6자리 인증번호 받기
                </button>
              ) : (
                <PinPad value={authCode} onChange={setAuthCode} label="인증번호 6자리" />
              )}
              <PinPad value={withdrawPw} onChange={setWithdrawPw} label={`출금비밀번호 6자리 ${u.withdrawPw ? "" : "(첫 입력 시 자동 등록)"}`} />
            </div>

            <button onClick={() => { void (action === "withdraw" ? submitWithdraw() : submitDeposit()); }}
              className="w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary hover:scale-[1.02] transition">
              {action === "withdraw" ? "출금 신청" : "충전 신청"}
            </button>
            <p className="text-[10px] text-muted-foreground text-center">관리자 승인 후 1시간 이내 처리. 거래코드 자동 발급.</p>
          </div>
        )}

        {action === "history" && (
          <div className="space-y-2">
            {[...db.deposits, ...db.withdraws]
              .filter((x: any) => x.userId === u.id)
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((x: any) => {
                const isDep = "packageId" in x;
                return (
                  <div key={x.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold">
                        {isDep ? `충전 · ${x.packageName}` : `출금 · ${x.method === "bank" ? x.bank : x.network}`}
                        <span className="ml-2 text-[10px] text-muted-foreground">{x.method === "coin" ? "🪙 COIN" : "🏦 BANK"}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{new Date(x.createdAt).toLocaleString("ko-KR")}</div>
                      {x.txCode && <div className="text-[10px] text-secondary font-mono mt-0.5">{x.txCode}</div>}
                    </div>
                    <div className="text-right">
                      <div className={`font-display font-bold ${isDep ? "text-secondary" : "text-primary"}`}>
                        {isDep ? "+" : "-"}{formatKRW(x.amount)}
                      </div>
                      <div className={`text-[10px] font-bold ${x.status === "pending" ? "text-gold" : x.status === "approved" ? "text-secondary" : "text-destructive"}`}>
                        {x.status === "pending" ? "승인 대기" : x.status === "approved" ? "승인됨" : "거절됨"}
                      </div>
                    </div>
                  </div>
                );
              })}
            {[...db.deposits, ...db.withdraws].filter((x: any) => x.userId === u.id).length === 0 && (
              <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">아직 거래 내역이 없습니다</div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1.5 font-bold">{label}</div>
      {children}
    </div>
  );
}
