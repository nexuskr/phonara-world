import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { useDB, formatKRW, uid, gen6, WITHDRAW_LIMITS } from "@/lib/store";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Clock, Coins, Banknote, Copy, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PinPad from "@/components/PinPad";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { supabase } from "@/integrations/supabase/client";
import { refreshWallet } from "@/lib/missions-rpc";
import ServerTxList from "@/components/wallet/ServerTxList";
import WithdrawalHistoryList from "@/components/wallet/WithdrawalHistoryList";
import DepositHistoryList from "@/components/wallet/DepositHistoryList";
import WithdrawIntentInterceptor from "@/components/conversion/WithdrawIntentInterceptor";
import AMLGate from "@/components/wallet/AMLGate";
import WithdrawQueueStatus from "@/components/wallet/WithdrawQueueStatus";
import WithdrawReceiptUpload from "@/components/wallet/WithdrawReceiptUpload";
import WithdrawETABadge from "@/components/wallet/WithdrawETABadge";
import NotificationPreferencesPanel from "@/components/wallet/NotificationPreferencesPanel";
import RiskLimitsPanel from "@/components/wallet/RiskLimitsPanel";
import InsuranceFundDashboard from "@/components/InsuranceFundDashboard";
import { z } from "zod";
import Disclaimer from "@/components/Disclaimer";
import StepUpGate from "@/components/security/StepUpGate";
import { useStepUp } from "@/hooks/use-step-up";

type AssetTab = "bank" | "coin";
type ActionTab = "withdraw" | "deposit" | "history";
type DepositChannel = "bank" | "voucher" | "coin";
type VoucherBrand = "culture" | "happy" | "cultureland";

const BANKS = ["KB", "Shinhan", "Woori", "Hana", "Nonghyup", "Kakao Bank", "Toss Bank"] as const;
const BANK_LABEL: Record<string, { ko: string; en: string }> = {
  "KB": { ko: "KB국민", en: "KB Kookmin" },
  "Shinhan": { ko: "신한", en: "Shinhan" },
  "Woori": { ko: "우리", en: "Woori" },
  "Hana": { ko: "하나", en: "Hana" },
  "Nonghyup": { ko: "농협", en: "Nonghyup" },
  "Kakao Bank": { ko: "카카오뱅크", en: "Kakao Bank" },
  "Toss Bank": { ko: "토스뱅크", en: "Toss Bank" },
};

export default function Wallet() {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const { t } = useTranslation("wallet");
  const { t: tw } = useTranslation("walletToast");
  const { i18n } = useTranslation();
  const lng = (i18n.language || "ko").startsWith("en") ? "en" : "ko";
  const user = useRequireAuth() ?? db.user;
  const [asset, setAsset] = useState<AssetTab>("bank");
  const [action, setAction] = useState<ActionTab>("withdraw");
  const { requireStepUp, dialogProps: stepUpProps } = useStepUp();

  useEffect(() => { void refreshWallet(); }, []);

  // shared
  const [amount, setAmount] = useState("");
  // bank
  const [bank, setBank] = useState<string>("KB");
  const [account, setAccount] = useState("");
  // coin
  const [coinAddr, setCoinAddr] = useState("");
  const [network, setNetwork] = useState<"TRC20" | "ERC20" | "BEP20">("TRC20");
  // P1: deposit channel + voucher
  const [depositChannel, setDepositChannel] = useState<DepositChannel>("bank");
  const [voucherBrand, setVoucherBrand] = useState<VoucherBrand>("culture");
  const [voucherPin, setVoucherPin] = useState("");
  // verification
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [withdrawPw, setWithdrawPw] = useState("");
  const [resultCode, setResultCode] = useState<string | null>(null);
  // P2: AML gate
  const [amlOpen, setAmlOpen] = useState(false);
  const [amlLevel, setAmlLevel] = useState<1 | 2 | 3>(2);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);

  if (!user) return null;
  const u = user;

  function sendCode() {
    const c = gen6();
    setSentCode(c);
    toast({ title: tw("codeSent"), description: tw("codeSentDesc", { code: c }) });
  }

  function ensureWithdrawPw() {
    if (!u.withdrawPw) {
      const pw = prompt(tw("pinPrompt"));
      if (pw && /^\d{6}$/.test(pw)) {
        setDb(d => ({ ...d, user: d.user ? { ...d.user, withdrawPw: pw } : null }));
        return pw;
      }
      toast({ title: tw("pinInvalid") });
      return null;
    }
    return u.withdrawPw;
  }

  async function submitWithdraw() {
    const a = Number(amount);
    if (!a || a < 10000) { toast({ title: tw("minWithdraw") }); return; }
    const balance = asset === "bank" ? u.balance : u.coinBalance;
    if (a > balance) { toast({ title: tw("insufficient") }); return; }
    const limit = WITHDRAW_LIMITS[u.tier];
    if (limit !== -1 && a > limit) {
      toast({ title: tw("limitOver", { tier: u.tier }), description: tw("limitOverDesc", { limit: formatKRW(limit) }) });
      return;
    }

    // Zod validation: structured field-level checks
    const schema = asset === "bank"
      ? z.object({
          amount: z.number().int().min(10000, "최소 출금액은 10,000원").max(50_000_000, "최대 5천만원"),
          bank: z.string().min(1, "은행을 선택해주세요"),
          account: z.string().regex(/^[0-9-]{10,20}$/, "올바른 계좌번호를 입력해주세요 (10-20자리)"),
        })
      : z.object({
          amount: z.number().int().min(10000),
          coinAddr: z.string().min(20, "지갑 주소를 정확히 입력해주세요").max(80),
          network: z.enum(["TRC20", "ERC20", "BEP20"]),
        });
    const parsed = schema.safeParse(
      asset === "bank"
        ? { amount: a, bank, account: account.replace(/\s/g, "") }
        : { amount: a, coinAddr: coinAddr.trim(), network }
    );
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast({ title: "입력 오류", description: first.message, variant: "destructive" });
      return;
    }

    if (sentCode !== authCode) { toast({ title: tw("codeMismatch") }); return; }
    if (!/^\d{6}$/.test(withdrawPw)) { toast({ title: tw("pinMismatch") }); return; }

    // 강력 스텝업 인증 (TOTP 우선, 없으면 이메일 OTP)
    const stepUpOk = await requireStepUp("출금");
    if (!stepUpOk) {
      toast({ title: "추가 인증이 필요합니다", description: "출금 진행 전 본인확인을 완료해주세요.", variant: "destructive" });
      return;
    }

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
      const amlMatch = msg.match(/aml_required:(\d)/);
      if (amlMatch) {
        const lvl = Math.min(3, Math.max(1, Number(amlMatch[1]))) as 1 | 2 | 3;
        setAmlLevel(lvl);
        setAmlOpen(true);
        toast({ title: tw("withdrawFail"), description: t("amlBlocked", { level: lvl }) as string, variant: "destructive" });
        return;
      }
      const friendly = msg.includes("pin mismatch") ? tw("pinError")
        : msg.includes("below_min") ? tw("belowMin")
        : msg.includes("insufficient_funds") ? tw("insufficient")
        : msg.includes("daily_withdraw_limit") ? tw("dailyLimit")
        : msg;
      toast({ title: tw("withdrawFail"), description: friendly, variant: "destructive" });
      return;
    }

    const r = data as any;
    setResultCode(r?.tx_code ?? null);

    // Attach receipt screenshot to the new withdrawal_requests row (if uploaded)
    if (receiptPath && r?.tx_code) {
      const { error: upErr } = await supabase
        .from("withdrawal_requests")
        .update({ receipt_url: receiptPath })
        .eq("user_id", u.id)
        .eq("tx_code", r.tx_code);
      if (upErr) console.warn("[withdraw] receipt attach failed:", upErr.message);
    }

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
    setAmount(""); setAccount(""); setCoinAddr(""); setSentCode(null); setAuthCode(""); setWithdrawPw(""); setReceiptPath(null);
    toast({ title: tw("withdrawDone"), description: tw("withdrawDoneDesc", { tier: u.tier }) });
  }

  async function submitDeposit() {
    const a = Number(amount);
    if (!a || a < 10000) { toast({ title: tw("minDeposit") }); return; }
    if (sentCode !== authCode) { toast({ title: tw("codeMismatch") }); return; }
    const pw = ensureWithdrawPw();
    if (!pw) return;
    if (pw !== withdrawPw) { toast({ title: tw("pinMismatchAlt") }); return; }
    const channel: DepositChannel = asset === "coin" ? "coin" : depositChannel;
    if (channel === "voucher") {
      if (!voucherPin || voucherPin.length < 12) { toast({ title: t("voucherPinPh") as string }); return; }
    }
    // Client-side prefix guard for coin addresses (fast feedback)
    if (channel === "coin") {
      const addr = coinAddr.trim();
      const okPrefix =
        (network === "TRC20" && /^T[A-Za-z0-9]{25,40}$/.test(addr)) ||
        (network === "ERC20" && /^0x[a-fA-F0-9]{40}$/.test(addr)) ||
        (network === "BEP20" && /^0x[a-fA-F0-9]{40}$/.test(addr));
      if (!okPrefix) {
        toast({ title: "코인 주소 형식 오류", description: `${network} 네트워크 주소 형식과 다릅니다.`, variant: "destructive" });
        return;
      }
    }
    try {
      const { submitDeposit: rpcSubmitDeposit, validateDepositInput } = await import("@/lib/deposits-rpc");
      // Server-side validation (duplicates, network mismatch, bank length)
      try {
        const v = await validateDepositInput({
          method: channel,
          coinAddress: channel === "coin" ? coinAddr.trim() : null,
          coinNetwork: channel === "coin" ? network : null,
          voucherBrand: channel === "voucher" ? voucherBrand : null,
          voucherPin: channel === "voucher" ? voucherPin : null,
          bankAccount: channel === "bank" ? account : null,
        });
        const high = v.warnings?.find(w => w.severity === "high");
        if (high) {
          toast({ title: "신청 차단", description: high.message, variant: "destructive" });
          return;
        }
        const med = v.warnings?.find(w => w.severity === "medium");
        if (med) toast({ title: "주의", description: med.message });
      } catch (ve: any) {
        // validation RPC failure is non-fatal; admin will still review
        console.warn("[deposit] validate skipped:", ve?.message);
      }
      const r = await rpcSubmitDeposit({
        amount: a,
        method: channel,
        packageId: "manual",
        packageName: channel === "voucher"
          ? t(`voucher${voucherBrand === "culture" ? "Culture" : voucherBrand === "happy" ? "Happy" : "Cultureland"}`) as string
          : channel === "bank" ? tw("bankDeposit") : tw("coinDeposit"),
        receiptUrl: null,
        memo: null,
        voucherBrand: channel === "voucher" ? voucherBrand : null,
        voucherPin: channel === "voucher" ? voucherPin : null,
      });
      const txCode = "DP-" + r.id.replace(/-/g, "").slice(0, 10).toUpperCase();
      setDb(d => ({
        ...d,
        deposits: [{
          id: uid(), userId: u.id, nickname: u.nickname,
          packageId: "manual",
          packageName: channel === "voucher" ? "상품권" : channel === "bank" ? tw("bankDeposit") : tw("coinDeposit"),
          amount: a, method: asset, txCode, status: "pending", createdAt: Date.now(),
        }, ...d.deposits],
      }));
      setResultCode(txCode);
      setAmount(""); setVoucherPin(""); setSentCode(null); setAuthCode(""); setWithdrawPw("");
      const bonusMsg = r.bonus_amount > 0 ? ` +${formatKRW(r.bonus_amount)} 보너스` : "";
      toast({ title: tw("depositDone"), description: tw("depositDoneDesc") + bonusMsg });
    } catch (e: any) {
      toast({ title: tw("depositFail"), description: e.message ?? tw("depositFailDesc"), variant: "destructive" });
    }
  }

  return (
    <Layout>
      <HubTabs hub="treasury" />
      <div className="container pt-6 pb-10 animate-liquid-in max-w-3xl">
        <div className="mb-5 sm:mb-6">
          <h1 className="font-imperial text-3xl sm:text-4xl tracking-[0.2em] text-gradient-imperial flex items-center gap-3">
            <WalletIcon className="w-6 h-6 text-primary" />
            {t("title")}
          </h1>
          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{t("tierLimit", { tier: u.tier })}</span>
            <span className="text-money font-black tabular-nums">
              {WITHDRAW_LIMITS[u.tier] === -1 ? t("unlimited") : formatKRW(WITHDRAW_LIMITS[u.tier])}
            </span>
          </div>
        </div>

        {/* Asset switcher */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {([
            { key: "bank" as const, icon: Banknote, label: t("bankBalance"), value: formatKRW(u.balance), unit: "" },
            { key: "coin" as const, icon: Coins, label: t("coinBalance"), value: u.coinBalance.toLocaleString(), unit: "USDT" },
          ]).map(({ key, icon: Icon, label, value, unit }) => {
            const active = asset === key;
            return (
              <button
                key={key}
                onClick={() => setAsset(key)}
                className={`relative p-4 sm:p-5 rounded-2xl text-left transition press overflow-hidden min-h-[110px] ${
                  active
                    ? "glass-strong border border-primary/60 glow-imperial"
                    : "glass border border-border/40 hover:border-primary/30"
                }`}
              >
                {active && <div className="absolute inset-0 bg-gradient-imperial opacity-[0.07] pointer-events-none" />}
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-[10px] tracking-[0.18em] font-bold text-muted-foreground uppercase">{label}</span>
                </div>
                <div className="mt-3 text-money-strong text-2xl sm:text-3xl font-black tracking-tight">
                  {value}{unit && <span className="text-sm ml-1.5 opacity-90">{unit}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { id: "withdraw", label: t("tabWithdraw"), icon: ArrowDownToLine },
            { id: "deposit", label: t("tabDeposit"), icon: ArrowUpFromLine },
            { id: "history", label: t("tabHistory"), icon: Clock },
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => { setAction(tab.id); setResultCode(null); }}
              className={`flex-1 min-h-[48px] py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition press ${
                action === tab.id
                  ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                  : "glass text-muted-foreground border border-border/40 hover:text-foreground hover:border-primary/30"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {resultCode && (action === "withdraw" || action === "deposit") && (
          <div className="glass-strong rounded-2xl p-6 border border-primary/40 glow-imperial mb-5 text-center">
            <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
            <div className="text-[10px] tracking-[0.25em] text-muted-foreground mt-2 font-bold uppercase">{t("issuedCode")}</div>
            <div className="font-mono font-black text-money-strong text-2xl tracking-[0.1em] mt-2">{resultCode}</div>
            <button
              onClick={() => { navigator.clipboard.writeText(resultCode); toast({ title: "✓" }); }}
              className="mt-3 px-4 py-2 rounded-full glass border border-primary/30 text-xs text-primary inline-flex items-center gap-1.5 hover:border-primary/60 transition min-h-[36px]"
            >
              <Copy className="w-3.5 h-3.5" /> {t("copyCode")}
            </button>
          </div>
        )}

        {action === "withdraw" && <WithdrawQueueStatus />}

        {action !== "history" && (
          <div className="glass-strong rounded-2xl p-5 sm:p-6 space-y-5 border border-primary/20">
            <Field label={t("amount")}>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={t("amountPh")}
                className="w-full min-h-[52px] bg-input/60 border border-border rounded-xl px-4 py-3.5 text-base font-bold tabular-nums focus:outline-none focus:border-primary transition"
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {[10000, 50000, 100000].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="min-h-[44px] py-2.5 rounded-xl glass border border-border/40 text-xs font-bold tabular-nums hover:border-primary/40 hover:text-primary transition press"
                >
                  +{v.toLocaleString()}
                </button>
              ))}
            </div>

            {asset === "bank" && action === "withdraw" && (
              <>
                <Field label={t("bank")}>
                  <select value={bank} onChange={e => setBank(e.target.value)} className="w-full min-h-[52px] bg-input/60 border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary">
                    {BANKS.map(b => <option key={b} value={b}>{BANK_LABEL[b][lng]}</option>)}
                  </select>
                </Field>
                <Field label={t("account")}>
                  <input value={account} onChange={e => setAccount(e.target.value)} placeholder={t("accountPh")}
                    className="w-full min-h-[52px] bg-input/60 border border-border rounded-xl px-4 py-3.5 text-sm tabular-nums focus:outline-none focus:border-primary" />
                </Field>
              </>
            )}

            {asset === "bank" && action === "deposit" && (
              <>
                {/* Channel switcher: bank vs voucher */}
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { k: "bank" as const, label: t("channelBank"), badge: t("channelBankBonus") },
                    { k: "voucher" as const, label: t("channelVoucher"), badge: t("channelVoucherBonus") },
                  ]).map(({ k, label, badge }) => {
                    const active = depositChannel === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setDepositChannel(k)}
                        className={`min-h-[64px] p-3 rounded-xl text-left transition press border ${
                          active
                            ? "border-primary/60 bg-primary/[0.06] glow-imperial"
                            : "border-border/40 glass hover:border-primary/30"
                        }`}
                      >
                        <div className="text-xs font-black">{label}</div>
                        <div className={`text-[10px] tracking-wider mt-0.5 ${k === "voucher" ? "text-primary font-bold" : "text-muted-foreground"}`}>{badge}</div>
                      </button>
                    );
                  })}
                </div>

                {depositChannel === "bank" && (
                  <div className="glass rounded-xl p-4 text-xs space-y-2 border border-border/40">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("depositBankInfo")}</span><span className="font-bold tabular-nums">{BANK_LABEL["KB"][lng]} 123-456-78901234</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("depositOwner")}</span><span className="font-bold">{lng === "en" ? "Phonara Inc." : "(주)Phonara"}</span></div>
                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">{t("depositMemo")}</p>
                  </div>
                )}

                {depositChannel === "voucher" && (
                  <>
                    <Field label={t("voucherBrand")}>
                      <select
                        value={voucherBrand}
                        onChange={e => setVoucherBrand(e.target.value as VoucherBrand)}
                        className="w-full min-h-[52px] bg-input/60 border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="culture">{t("voucherCulture")}</option>
                        <option value="happy">{t("voucherHappy")}</option>
                        <option value="cultureland">{t("voucherCultureland")}</option>
                      </select>
                    </Field>
                    <Field label={t("voucherPin")}>
                      <input
                        value={voucherPin}
                        onChange={e => setVoucherPin(e.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 24))}
                        placeholder={t("voucherPinPh")}
                        className="w-full min-h-[52px] bg-input/60 border border-border rounded-xl px-4 py-3.5 text-sm font-mono tracking-wider focus:outline-none focus:border-primary"
                      />
                    </Field>
                    <p className="text-[10px] text-muted-foreground">{t("voucherNotice")}</p>
                  </>
                )}

                {/* Bonus preview */}
                {Number(amount) > 0 && (() => {
                  const a = Number(amount);
                  const pct = depositChannel === "voucher" ? 3 : 0;
                  const bonus = Math.floor(a * pct / 100);
                  if (bonus <= 0) return null;
                  return (
                    <div className="rounded-xl p-3.5 border border-primary/40 bg-gradient-imperial/10">
                      <div className="text-[10px] tracking-[0.2em] text-primary font-bold uppercase">{t("bonusPreview")}</div>
                      <div className="text-money-strong text-xl font-black mt-1">{formatKRW(a + bonus)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {t("bonusBreakdown", { amount: formatKRW(a), bonus: formatKRW(bonus), pct })}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {asset === "coin" && action === "withdraw" && (
              <>
                <Field label={t("network")}>
                  <select value={network} onChange={e => setNetwork(e.target.value as any)} className="w-full min-h-[52px] bg-input/60 border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary">
                    {["TRC20", "ERC20", "BEP20"].map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label={t("coinAddr")}>
                  <input value={coinAddr} onChange={e => setCoinAddr(e.target.value)} placeholder={t("coinAddrPh")}
                    className="w-full min-h-[52px] bg-input/60 border border-border rounded-xl px-4 py-3.5 text-sm font-mono focus:outline-none focus:border-primary" />
                </Field>
              </>
            )}

            {asset === "coin" && action === "deposit" && (
              <>
                <div className="glass rounded-xl p-4 text-xs space-y-2 border border-primary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("network")}</span>
                    <span className="font-bold">TRC20</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("channelCoin")}</span>
                    <span className="text-primary font-black">{t("channelCoinBonus")}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-muted-foreground">{t("adminAddr")}</span>
                    <code className="font-mono text-[10px] break-all bg-muted/40 p-2.5 rounded-lg border border-border/40">TXyz1234567890ABCDEF1234567890ABCDEF12</code>
                    <button onClick={() => { navigator.clipboard.writeText("TXyz1234567890ABCDEF1234567890ABCDEF12"); toast({ title: "✓" }); }}
                      className="text-[11px] text-primary inline-flex items-center gap-1 self-start min-h-[32px]"><Copy className="w-3 h-3" /> {t("copyAddr")}</button>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">{t("coinDepositMemo")}</p>
                  <p className="text-[10px] text-primary/80 font-bold">★ {t("coinMasterTeaser")}</p>
                </div>

                {Number(amount) > 0 && (() => {
                  const a = Number(amount);
                  const bonus = Math.floor(a * 8 / 100);
                  return (
                    <div className="rounded-xl p-3.5 border border-primary/40 bg-gradient-imperial/10">
                      <div className="text-[10px] tracking-[0.2em] text-primary font-bold uppercase">{t("bonusPreview")}</div>
                      <div className="text-money-strong text-xl font-black mt-1">{formatKRW(a + bonus)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {t("bonusBreakdown", { amount: formatKRW(a), bonus: formatKRW(bonus), pct: 8 })}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ETA + Receipt (withdraw only) */}
            {action === "withdraw" && Number(amount) >= 10000 && (
              <WithdrawETABadge tier={u.tier} amount={Number(amount)} />
            )}
            {action === "withdraw" && (
              <WithdrawReceiptUpload userId={u.id} onUploaded={setReceiptPath} />
            )}

            {/* Verification block */}
            <div className="rounded-xl p-4 space-y-3 border border-primary/20 bg-primary/[0.03]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold tracking-wider">{t("twoFactor")}</span>
              </div>
              {!sentCode ? (
                <button
                  onClick={sendCode}
                  className="w-full min-h-[48px] py-3 rounded-xl glass border border-primary/40 text-primary text-xs font-bold hover:bg-primary/10 hover:border-primary/70 transition press"
                >
                  {t("sendCode")}
                </button>
              ) : (
                <PinPad value={authCode} onChange={setAuthCode} label={t("authCodeLabel")} />
              )}
              <PinPad value={withdrawPw} onChange={setWithdrawPw} label={`${t("pinLabel")} ${u.withdrawPw ? "" : t("pinFirst")}`} />
            </div>

            {action === "withdraw" ? (
              <WithdrawIntentInterceptor amount={Number(amount) || 0}>
                {(handle) => (
                  <button
                    onClick={(e) => { handle(e); if (!e.defaultPrevented) void submitWithdraw(); }}
                    className="w-full min-h-[56px] py-4 rounded-xl bg-gradient-imperial text-primary-foreground font-black text-base tracking-wider glow-imperial hover:scale-[1.01] transition press">
                    {t("submitWithdraw")}
                  </button>
                )}
              </WithdrawIntentInterceptor>
            ) : (
              <button onClick={() => { void submitDeposit(); }}
                className="w-full min-h-[56px] py-4 rounded-xl bg-gradient-imperial text-primary-foreground font-black text-base tracking-wider glow-imperial hover:scale-[1.01] transition press">
                {t("submitDeposit")}
              </button>
            )}
            <p className="text-[10px] text-muted-foreground text-center pt-1">{t("formFooter")}</p>
          </div>
        )}

        {action === "history" && (
          <div className="space-y-5">
            <div>
              <div className="text-[10px] tracking-[0.25em] text-primary font-black mb-3 uppercase">출금 이력</div>
              <WithdrawalHistoryList />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-primary font-black mb-3 uppercase">충전 이력</div>
              <DepositHistoryList />
            </div>
            <NotificationPreferencesPanel userId={u.id} />
            <RiskLimitsPanel />
            <InsuranceFundDashboard variant="user" />
            <div>
              <div className="text-[10px] tracking-[0.25em] text-primary font-black mb-3 uppercase">{t("historyTitle")}</div>
              <ServerTxList />
            </div>
          </div>
        )}
        <Disclaimer variant="withdraw" className="mt-4" />
      </div>
      <AMLGate open={amlOpen} level={amlLevel} onClose={() => setAmlOpen(false)} onApproved={() => setAmlOpen(false)} />
    </Layout>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.2em] text-muted-foreground mb-2 font-bold uppercase">{label}</div>
      {children}
    </div>
  );
}
