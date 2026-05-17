import { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { g } from "@pkg/core/i18n/glossary";
import { formatFromPhon } from "@/lib/displayCurrency";
import { Banknote, Coins, Gift, ArrowLeft, Loader2, Clock3 } from "lucide-react";
import { useWithdraw, type WithdrawMethod } from "../hooks/useWithdraw";
import BankSearchSelect from "./BankSearchSelect";

interface Props {
  available: number;
  minWithdraw: number;
  ctl: ReturnType<typeof useWithdraw>;
}

export default function WithdrawModal({ available, minWithdraw, ctl }: Props) {
  const { open, closeModal, step, next, prev, form, update, amountNum, canNext1, canNext2, canSubmit, submitting, submit } = ctl;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeModal]);

  const titles = [g("withdrawStep1Title"), g("withdrawStep2Title"), g("withdrawStep3Title")];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeModal(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={prev} className="p-2 rounded-lg hover:bg-muted min-h-[40px] min-w-[40px]" aria-label={g("withdrawPrev")}>
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <DialogTitle className="text-xl font-black flex-1">
              {titles[step - 1]}
            </DialogTitle>
            <span className="text-xs font-black text-amber-300 tabular-nums">{step}/3</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <Step1
              amount={form.amount}
              onAmount={(v) => update("amount", v)}
              available={available}
              minWithdraw={minWithdraw}
            />
          )}
          {step === 2 && (
            <Step2 form={form} update={update} />
          )}
          {step === 3 && (
            <Step3
              amount={amountNum}
              method={form.method}
              pin={form.pin}
              onPin={(v) => update("pin", v)}
            />
          )}
        </div>

        <div className="px-5 pb-5 pt-2">
          {step < 3 ? (
            <button
              onClick={next}
              disabled={step === 1 ? !canNext1 : !canNext2}
              className="w-full min-h-[56px] rounded-xl bg-amber-400 text-neutral-900 font-black text-lg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] transition"
            >
              {g("withdrawNext")}
            </button>
          ) : (
            <button
              onClick={() => void submit()}
              disabled={!canSubmit || submitting}
              className="w-full min-h-[56px] rounded-xl bg-amber-400 text-neutral-900 font-black text-lg disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] transition inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {g("withdrawSubmit")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step1({ amount, onAmount, available, minWithdraw }: {
  amount: string; onAmount: (v: string) => void; available: number; minWithdraw: number;
}) {
  const num = Number(amount) || 0;
  const tooLow = num > 0 && num < minWithdraw;
  const tooHigh = num > available;
  const chips = [5000, 10000, 50000];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-xs text-muted-foreground font-bold">
          {g("walletAvailable")} · {Math.floor(available).toLocaleString()} PHON
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {chips.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onAmount(String(v))}
            className="min-h-[48px] rounded-xl border border-border/40 glass text-xs font-black tabular-nums hover:border-amber-400/60 transition"
          >
            {v.toLocaleString()}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onAmount(String(Math.floor(available)))}
          className="min-h-[48px] rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-300 text-xs font-black hover:bg-amber-400/20 transition"
        >
          {g("withdrawAllChip")}
        </button>
      </div>

      <label className="block">
        <span className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">
          {g("withdrawAmountLabel")}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => onAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
          placeholder="0"
          className="mt-1.5 w-full min-h-[64px] rounded-xl bg-input border border-border px-4 py-3 text-3xl font-black tabular-nums text-right focus:outline-none focus:border-amber-400"
        />
        <div className="mt-1.5 text-right text-sm text-muted-foreground tabular-nums">
          {g("walletKrwApprox")} {formatFromPhon(num, "KRW")}
        </div>
      </label>

      {tooLow && (
        <div className="text-sm font-bold text-pink-400">
          {g("withdrawErrMin")} · {minWithdraw.toLocaleString()} PHON
        </div>
      )}
      {tooHigh && (
        <div className="text-sm font-bold text-pink-400">{g("withdrawErrFunds")}</div>
      )}
    </div>
  );
}

function MethodCard({ active, disabled, icon: Icon, label, sub, onClick }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full min-h-[80px] rounded-2xl border p-4 flex items-center gap-3 text-left transition
        ${disabled
          ? "border-border/30 bg-muted/30 opacity-60 cursor-not-allowed"
          : active
            ? "border-amber-400 bg-amber-400/10 shadow-[0_0_24px_hsl(45_100%_55%/0.25)]"
            : "border-border/40 glass hover:border-amber-400/50"}`}
    >
      <Icon className={`w-6 h-6 shrink-0 ${active ? "text-amber-300" : "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <div className="font-black text-base">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

function Step2({ form, update }: { form: any; update: any }) {
  const set = (m: WithdrawMethod) => update("method", m);
  return (
    <div className="space-y-3">
      <MethodCard
        active={form.method === "bank"}
        icon={Banknote}
        label={g("withdrawMethodBank")}
        sub={g("withdrawEtaWithin5")}
        onClick={() => set("bank")}
      />
      <MethodCard
        active={form.method === "coin"}
        icon={Coins}
        label={g("withdrawMethodCoin")}
        sub="USDT · TRC20 / ERC20 / BEP20"
        onClick={() => set("coin")}
      />
      <MethodCard
        disabled
        icon={Gift}
        label={g("withdrawMethodGift")}
        sub={g("withdrawMethodSoon")}
        onClick={() => {}}
      />
      <p className="text-[11px] text-muted-foreground text-center pt-1">
        {g("withdrawPolicyNotice")}
      </p>

      {form.method === "bank" ? (
        <div className="space-y-3 pt-2">
          <label className="block">
            <span className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">
              {g("withdrawBankName")}
            </span>
            <BankSearchSelect
              value={form.bankName}
              onChange={(v) => update("bankName", v)}
            />
          </label>
          <label className="block">
            <span className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">
              {g("withdrawBankAccount")}
            </span>
            <input
              inputMode="numeric"
              value={form.bankAccount}
              onChange={(e) => update("bankAccount", e.target.value.replace(/[^0-9-]/g, "").slice(0, 20))}
              placeholder="123-456-7890123"
              className="mt-1.5 w-full min-h-[52px] rounded-xl bg-input border border-border px-4 text-base tabular-nums focus:outline-none focus:border-amber-400"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <label className="block">
            <span className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">
              {g("withdrawCoinNetwork")}
            </span>
            <select
              value={form.coinNetwork}
              onChange={(e) => update("coinNetwork", e.target.value as any)}
              className="mt-1.5 w-full min-h-[52px] rounded-xl bg-input border border-border px-4 text-base focus:outline-none focus:border-amber-400"
            >
              {["TRC20", "ERC20", "BEP20"].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">
              {g("withdrawCoinAddress")}
            </span>
            <input
              value={form.coinAddress}
              onChange={(e) => update("coinAddress", e.target.value.trim())}
              placeholder="T... / 0x..."
              className="mt-1.5 w-full min-h-[52px] rounded-xl bg-input border border-border px-4 text-sm font-mono focus:outline-none focus:border-amber-400"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function Step3({ amount, method, pin, onPin }: {
  amount: number; method: WithdrawMethod; pin: string; onPin: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-400/5 p-5 space-y-2.5">
        <Row label={g("withdrawSummaryAmount")} value={`${Math.floor(amount).toLocaleString()} PHON`} sub={`${g("walletKrwApprox")} ${formatFromPhon(amount, "KRW")}`} />
        <Row label={g("withdrawSummaryMethod")} value={method === "bank" ? g("withdrawMethodBank") : g("withdrawMethodCoin")} />
        <Row label={g("withdrawSummaryEta")} value={g("withdrawEtaWithin5")} icon={<Clock3 className="w-4 h-4 text-amber-300" />} />
      </div>

      <label className="block">
        <span className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">
          {g("withdrawPinLabel")}
        </span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={pin}
          onChange={(e) => onPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          className="mt-1.5 w-full min-h-[64px] rounded-xl bg-input border border-border px-4 text-2xl tracking-[0.4em] text-center font-black focus:outline-none focus:border-amber-400"
        />
        <p className="mt-2 text-xs text-muted-foreground text-center">{g("withdrawPinHint")}</p>
      </label>
    </div>
  );
}

function Row({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-muted-foreground font-bold">{label}</span>
      <span className="text-right">
        <span className="block font-black text-base inline-flex items-center gap-1.5">{icon}{value}</span>
        {sub && <span className="block text-xs text-muted-foreground tabular-nums">{sub}</span>}
      </span>
    </div>
  );
}
