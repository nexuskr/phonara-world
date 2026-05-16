/**
 * useDeposit — orchestration. realtime/draft/countdown/telemetry/navGuard 위임.
 *
 * State machine: step 1 → 2 → 3
 * Methods: coin / bank / voucher
 * Locks: financialInputsLocked (L2 — amount/method만)
 *
 * Realtime = UX, Polling = Truth (L4 merge rules in realtime hook + here).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { g } from "@pkg/core/i18n/glossary";
import {
  createDepositIntent, getPhonBalance, getMyPendingDeposits, PHON_PER_USDT,
  type CryptoDepositIntent,
} from "@/lib/phonaraPay";
import { submitDeposit, uploadReceipt, type VoucherBrand } from "@/lib/deposits-rpc";
import { useFirstEmperorBurst } from "@/components/empire/FirstEmperorBurst";
import {
  validateAmount, validateVoucherPin, shouldOverwriteStatus,
} from "../lib/depositValidators";
import { sanitizeCompact, hashVoucherPin } from "../lib/sanitize";
import { useDepositDraft } from "./useDepositDraft";
import { useDepositTelemetry, type AbandonReason } from "./useDepositTelemetry";
import { useDepositCountdown } from "./useDepositCountdown";
import { useDepositRealtime } from "./useDepositRealtime";
import { useDepositNavGuard, confirmLeave } from "./useDepositNavGuard";

export type DepositMethod = "coin" | "bank" | "voucher";
export type DepositStep = 1 | 2 | 3;

const VOUCHER_HASH_KEY = "phonara:voucher_pin_attempts:v1";
const VOUCHER_MAX_ATTEMPTS = 3;

interface VoucherAttemptEntry { hash: string; count: number; firstAt: number }

function readVoucherAttempts(): VoucherAttemptEntry[] {
  try {
    const raw = localStorage.getItem(VOUCHER_HASH_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as VoucherAttemptEntry[];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return arr.filter(e => e.firstAt > cutoff);
  } catch { return []; }
}

function writeVoucherAttempts(arr: VoucherAttemptEntry[]) {
  try { localStorage.setItem(VOUCHER_HASH_KEY, JSON.stringify(arr)); } catch { /* noop */ }
}

interface UseDepositOpts {
  onSuccess?: () => void;
}

export function useDeposit({ onSuccess }: UseDepositOpts = {}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DepositStep>(1);
  const [method, setMethod] = useState<DepositMethod>("coin");
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [financialInputsLocked, setFinancialInputsLocked] = useState(false);

  // method-specific
  const [intent, setIntent] = useState<CryptoDepositIntent | null>(null);
  const [bankName, setBankName] = useState("KB국민");
  const [bankAccount, setBankAccount] = useState("");
  const [senderName, setSenderName] = useState("");
  const [voucherBrand, setVoucherBrand] = useState<VoucherBrand>("culture");
  const [voucherPin, setVoucherPin] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // sub-states
  const [beforeBalance, setBeforeBalance] = useState<number>(0);
  const [filledRow, setFilledRow] = useState<CryptoDepositIntent | null>(null);
  const [graceChecking, setGraceChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [receiveAddress, setReceiveAddress] = useState<string | null>(null);

  const clientReqIdRef = useRef<string>("");
  const statusRef = useRef<string>("intent_created");

  const draft = useDepositDraft();
  const telem = useDepositTelemetry(open);
  const burst = useFirstEmperorBurst((s) => s.fire);

  // Load receive address once (lazy on open)
  useEffect(() => {
    if (!open || receiveAddress) return;
    supabase.rpc("get_pay_receive_address").then(({ data, error }) => {
      if (error) return;
      setReceiveAddress((data as string | null) ?? null);
    });
  }, [open, receiveAddress]);

  // Snapshot balance before deposit
  useEffect(() => {
    if (!open) return;
    void getPhonBalance().then(setBeforeBalance);
  }, [open]);

  // Soft-freeze on intent_created (L2: financial inputs only)
  useEffect(() => {
    setFinancialInputsLocked(!!intent && intent.status !== "filled" && intent.status !== "expired");
  }, [intent]);

  const closeInternal = useCallback((reason: AbandonReason) => {
    if (step < 3 && method) telem.abandon(method, step, reason);
    setOpen(false);
  }, [step, method, telem]);

  const closeRequested = useCallback((reason: AbandonReason = "close_button") => {
    const guardActive = step >= 2 && !!intent && intent.status !== "filled";
    if (guardActive && !confirmLeave()) return;
    closeInternal(reason);
  }, [step, intent, closeInternal]);

  const reset = useCallback(() => {
    setStep(1); setMethod("coin"); setAmount(""); setIntent(null);
    setBankAccount(""); setSenderName(""); setVoucherPin(""); setReceiptFile(null);
    setFinancialInputsLocked(false); setFilledRow(null); setGraceChecking(false);
    setLastChecked(null); statusRef.current = "intent_created";
    clientReqIdRef.current = "";
    draft.clear();
  }, [draft]);

  const openModal = useCallback(() => {
    reset();
    setOpen(true);
    // resume modal handled by component via draft.resumable
  }, [reset]);

  // Auto-fill sender name from profile nickname
  useEffect(() => {
    if (!open || senderName) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", data.user.id)
        .maybeSingle();
      if (prof?.nickname) setSenderName(prof.nickname);
    });
  }, [open, senderName]);

  // Persist draft on intent_created
  useEffect(() => {
    if (!intent) return;
    draft.save({
      method, amount: Number(amount) || 0,
      intentId: intent.id, expiresAt: new Date(intent.expires_at).getTime(),
      step, createdAt: Date.now(),
    });
  }, [intent, method, amount, step, draft]);

  // Polling truth (L4): every 30s when intent active
  const pollPending = useCallback(async () => {
    if (!intent || intent.status === "filled") return;
    const rows = await getMyPendingDeposits();
    setLastChecked(Date.now());
    const match = rows.find(r => r.id === intent.id);
    if (!match) return;
    if (shouldOverwriteStatus(match.status, statusRef.current)) {
      statusRef.current = match.status;
      setIntent(match);
      if (match.status === "filled") handleFilled(match);
    }
  }, [intent]);

  useEffect(() => {
    if (!open || !intent || intent.status === "filled") return;
    const t = window.setInterval(() => { void pollPending(); }, 30_000);
    return () => clearInterval(t);
  }, [open, intent, pollPending]);

  // Realtime
  const handleFilled = useCallback((row: CryptoDepositIntent) => {
    statusRef.current = "filled";
    setIntent(row);
    setFilledRow(row);
    setStep(3);
    notify.success(g("depositSuccess"), { description: g("depositCoinFilled") });
    window.dispatchEvent(new Event("wallet:refresh"));
    onSuccess?.();
    telem.filled(method);
    draft.clear();
    if (method === "coin") {
      const phon = Math.round(row.unique_amount * PHON_PER_USDT);
      burst({
        nft_level: "bronze", boost_pct: 0, max_leverage: 10,
        phon_bonus: Math.floor(phon * 0.1), first_bonus: false,
      });
    }
  }, [method, telem, draft, burst, onSuccess]);

  const { degraded } = useDepositRealtime({
    intentId: intent?.id ?? null,
    active: open && method === "coin",
    onFilled: handleFilled,
    onStatusUpdate: (row) => {
      if (shouldOverwriteStatus(row.status, statusRef.current)) {
        statusRef.current = row.status;
        setIntent(row);
      }
    },
  });

  // Nav guard
  useDepositNavGuard(open && step >= 2 && !!intent && intent.status !== "filled");

  // Countdown
  const expiresAt = intent ? new Date(intent.expires_at).getTime() : null;
  const countdown = useDepositCountdown(
    method === "coin" && intent && intent.status !== "filled" ? expiresAt : null,
    () => { void pollPending(); },
  );

  // Grace UI: when countdown hits 0, run 1 polling pass for 2-5s before showing expired
  useEffect(() => {
    if (!intent || method !== "coin") return;
    if (countdown.expired && intent.status !== "filled" && intent.status !== "expired") {
      setGraceChecking(true);
      const t = window.setTimeout(async () => {
        await pollPending();
        setGraceChecking(false);
      }, 3_000);
      return () => clearTimeout(t);
    }
  }, [countdown.expired, intent, method, pollPending]);

  // Resume draft
  const resumeDraft = useCallback(async () => {
    if (!draft.resumable) return;
    const d = draft.resumable;
    setMethod(d.method);
    setAmount(String(d.amount));
    setStep(d.step);
    if (d.intentId) {
      const rows = await getMyPendingDeposits();
      const match = rows.find(r => r.id === d.intentId);
      if (match) {
        setIntent(match);
        statusRef.current = match.status;
        if (match.status === "filled") handleFilled(match);
      }
    }
    draft.dismiss();
  }, [draft, handleFilled]);

  // Actions
  const setMethodSafe = useCallback((m: DepositMethod) => {
    if (financialInputsLocked) return;
    setMethod(m);
    telem.methodSelected(m);
  }, [financialInputsLocked, telem]);

  const setAmountSafe = useCallback((v: string) => {
    if (financialInputsLocked) return;
    setAmount(v.replace(/[^0-9]/g, "").slice(0, 12));
  }, [financialInputsLocked]);

  const amountNum = Number(amount) || 0;

  const canNext1 = !!method;
  const canNext2 = useMemo(() => {
    const amtErr = validateAmount(method, amountNum);
    if (amtErr) return false;
    if (method === "bank") {
      return bankAccount.replace(/\D/g, "").length >= 8 && senderName.trim().length >= 1;
    }
    if (method === "voucher") {
      return !validateVoucherPin(voucherPin);
    }
    return true;
  }, [method, amountNum, bankAccount, senderName, voucherPin]);

  const next = useCallback(() => {
    if (step === 1) {
      if (!canNext1) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!canNext2) {
        const amtErr = validateAmount(method, amountNum);
        if (amtErr === "amount_below_min") notify.error(g("depositErrMin"));
        else if (method === "voucher") notify.error(g("depositErrVoucherPin"));
        else notify.error(g("depositErrGeneric"));
        return;
      }
      void submit();
    }
  }, [step, canNext1, canNext2, method, amountNum]); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = useCallback(() => {
    setStep(s => (s === 1 ? 1 : ((s - 1) as DepositStep)));
  }, []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(sanitizeCompact(text));
      const tail = text.replace(/\s+/g, "").slice(-6).toUpperCase();
      notify.success(g("depositCopied"), { description: `…${tail}` });
    } catch {
      notify.error(g("depositErrGeneric"));
    }
  }, []);

  const regenerateIntent = useCallback(async () => {
    if (method !== "coin") return;
    if (!receiveAddress) {
      notify.error(g("depositErrGeneric"), { description: "운영자 주소 미설정" });
      return;
    }
    setSubmitting(true);
    try {
      const usdt = Math.max(1, Math.ceil(amountNum / 1300));
      const r = await createDepositIntent(usdt, receiveAddress);
      setIntent(r);
      statusRef.current = "awaiting_payment";
      setLastChecked(Date.now());
      telem.intentCreated("coin", r.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      notify.error(g("depositErrGeneric"), { description: msg.slice(0, 120) });
    } finally {
      setSubmitting(false);
    }
  }, [method, receiveAddress, amountNum, telem]);

  const submit = useCallback(async () => {
    if (submitting) return;
    if (!canNext2) return;
    if (!clientReqIdRef.current) clientReqIdRef.current = crypto.randomUUID();
    setSubmitting(true);
    telem.submitClicked(method, amountNum);
    try {
      if (method === "coin") {
        await regenerateIntent();
      } else if (method === "bank") {
        const memo = `${senderName.trim()} [cri:${clientReqIdRef.current.slice(0, 8)}]`;
        const r = await submitDeposit({
          amount: amountNum, method: "bank",
          memo, packageId: null, packageName: null,
        });
        telem.intentCreated("bank", r.id);
        setStep(3);
        notify.success(g("depositSuccess"), { description: g("depositEtaBank") });
        window.dispatchEvent(new Event("wallet:refresh"));
        onSuccess?.();
      } else if (method === "voucher") {
        // L3 voucher fraud soft limit
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id ?? "anon";
        const hash = await hashVoucherPin(voucherPin, uid);
        const list = readVoucherAttempts();
        const existing = list.find(e => e.hash === hash);
        if (existing && existing.count >= VOUCHER_MAX_ATTEMPTS) {
          notify.error(g("depositErrVoucherDup"));
          setSubmitting(false);
          return;
        }
        if (existing) existing.count += 1;
        else list.push({ hash, count: 1, firstAt: Date.now() });
        writeVoucherAttempts(list);

        let receiptUrl: string | null = null;
        if (receiptFile) {
          try { receiptUrl = await uploadReceipt(receiptFile); }
          catch { notify.error(g("depositErrUpload")); }
        }
        const r = await submitDeposit({
          amount: amountNum, method: "voucher",
          voucherBrand, voucherPin, receiptUrl,
          memo: `[cri:${clientReqIdRef.current.slice(0, 8)}]`,
        });
        telem.intentCreated("voucher", r.id);
        setStep(3);
        notify.success(g("depositSuccess"), { description: g("depositEtaVoucher") });
        window.dispatchEvent(new Event("wallet:refresh"));
        onSuccess?.();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate")) notify.error(g("depositErrDuplicate"));
      else notify.error(g("depositErrGeneric"), { description: msg.slice(0, 120) });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, canNext2, method, amountNum, senderName, voucherBrand, voucherPin, receiptFile, regenerateIntent, telem, onSuccess]);

  return {
    open, openModal, close: closeRequested,
    step, next, prev,
    method, setMethod: setMethodSafe,
    amount, setAmount: setAmountSafe, amountNum,
    bankName, setBankName,
    bankAccount, setBankAccount,
    senderName, setSenderName,
    voucherBrand, setVoucherBrand,
    voucherPin, setVoucherPin,
    receiptFile, setReceiptFile,
    intent, beforeBalance, filledRow,
    receiveAddress,
    countdown, graceChecking, lastChecked, degraded,
    submitting, financialInputsLocked,
    canNext1, canNext2,
    copy, submit, regenerateIntent, reset,
    draft, resumeDraft,
  };
}
