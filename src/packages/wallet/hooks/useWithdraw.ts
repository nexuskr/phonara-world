/**
 * useWithdraw — Sprint 2 3-step withdraw state machine.
 * Reuses `request_withdrawal` RPC. AAL2/PIN/frozen/OTP handled server-side.
 *
 * v15.2:
 *  - 모든 서버 에러를 사용자 친화 한국어 알림으로 매핑 (개발자 코드 노출 0).
 *  - step_up_required → 인라인 StepUpGate 다이얼로그를 띄우고 인증 성공 시 1회 자동 재시도.
 *  - 기본 은행: KB국민은행 (한국 은행 20종 전체 목록은 src/lib/koreanBanks.ts).
 */
import { useCallback, useRef, useState } from "react";
import { requestWithdrawal } from "@/lib/wallet";
import { notify } from "@/lib/notify";
import { DEFAULT_KOREAN_BANK_DISPLAY } from "@/lib/koreanBanks";
import { parseWithdrawError, emitAccountFrozen } from "@/lib/withdrawal/errors";

export type WithdrawMethod = "bank" | "coin";

export interface WithdrawForm {
  amount: string;
  method: WithdrawMethod;
  bankName: string;
  bankAccount: string;
  coinNetwork: "TRC20" | "ERC20" | "BEP20";
  coinAddress: string;
  pin: string;
}

const INIT: WithdrawForm = {
  amount: "",
  method: "bank",
  bankName: DEFAULT_KOREAN_BANK_DISPLAY,
  bankAccount: "",
  coinNetwork: "TRC20",
  coinAddress: "",
  pin: "",
};

export interface UseWithdrawOpts {
  available: number;
  minWithdraw: number;
  onSuccess?: () => void;
  /** 서버가 step_up_required 를 반환했을 때 호출 — true 반환 시 출금 자동 재시도. */
  requireStepUp?: (label?: string) => Promise<boolean>;
}

export function useWithdraw({ available, minWithdraw, onSuccess, requireStepUp }: UseWithdrawOpts) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<WithdrawForm>(INIT);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;

  const reset = useCallback(() => { setForm(INIT); setStep(1); }, []);
  const openModal = useCallback(() => { reset(); setOpen(true); }, [reset]);
  const closeModal = useCallback(() => { setOpen(false); }, []);

  const update = useCallback(<K extends keyof WithdrawForm>(k: K, v: WithdrawForm[K]) => {
    setForm(f => ({ ...f, [k]: v }));
  }, []);

  const amountNum = Number(form.amount) || 0;

  const canNext1 =
    amountNum >= minWithdraw && amountNum <= available && amountNum > 0;
  const canNext2 =
    form.method === "bank"
      ? form.bankAccount.replace(/[^0-9]/g, "").length >= 10
      : form.coinAddress.trim().length >= 20;
  const canSubmit = canNext1 && canNext2 && /^\d{6}$/.test(form.pin);

  const next = useCallback(() => {
    if (step === 1 && !canNext1) {
      if (amountNum < minWithdraw) {
        notify.error("최소 출금 금액 미만입니다", {
          description: `최소 ${minWithdraw.toLocaleString()} PHON부터 출금이 가능합니다.`,
        });
      } else if (amountNum > available) {
        notify.error("출금 가능 잔액이 부족합니다", {
          description: "현재 사용 가능 잔액을 확인해 주세요.",
        });
      }
      return;
    }
    if (step === 2 && !canNext2) {
      notify.error(
        form.method === "bank" ? "계좌번호를 확인해 주세요" : "지갑 주소를 확인해 주세요",
        { description: form.method === "bank" ? "숫자 10자리 이상으로 입력해 주세요." : "전체 주소(20자 이상)를 정확히 입력해 주세요." },
      );
      return;
    }
    setStep(s => (s === 3 ? 3 : ((s + 1) as 1 | 2 | 3)));
  }, [step, canNext1, canNext2, amountNum, minWithdraw, available, form.method]);

  const prev = useCallback(() => {
    setStep(s => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)));
  }, []);

  const callRpc = useCallback(async (f: WithdrawForm) => {
    await requestWithdrawal({
      amount: Number(f.amount) || 0,
      method: f.method,
      bankName: f.method === "bank" ? f.bankName : undefined,
      bankAccount: f.method === "bank" ? f.bankAccount : undefined,
      coinAddress: f.method === "coin" ? f.coinAddress : undefined,
      coinNetwork: f.method === "coin" ? f.coinNetwork : undefined,
      pin: f.pin,
    });
  }, []);

  const finishOk = useCallback(() => {
    notify.success("출금 요청이 접수됐어요", {
      description: "처리 현황은 출금 내역에서 확인할 수 있어요.",
    });
    setOpen(false);
    reset();
    window.dispatchEvent(new Event("wallet:refresh"));
    onSuccess?.();
  }, [onSuccess, reset]);

  const submit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await callRpc(formRef.current);
      finishOk();
    } catch (e: any) {
      const rawMsg = String(e?.message ?? "");

      // 1) step_up_required: 인라인 인증창 → 성공 시 1회 자동 재시도
      if (/step_up_required/i.test(rawMsg) && requireStepUp) {
        notify.info("추가 인증이 필요해요", {
          description: "잠시 후 인증 창이 열립니다. 등록한 인증 앱의 6자리 코드를 입력해 주세요.",
        });
        try {
          const ok = await requireStepUp("출금");
          if (ok) {
            try {
              await callRpc(formRef.current);
              finishOk();
              return;
            } catch (retryErr: any) {
              const r = String(retryErr?.message ?? "");
              const mapped = mapWithdrawError(r, minWithdraw);
              notify.error(mapped.title, { description: mapped.description });
              if (/pin/i.test(r)) setForm(f => ({ ...f, pin: "" }));
              return;
            }
          }
          // 사용자가 인증 취소 → 별도 알림 없이 종료
          return;
        } catch {
          return;
        }
      }

      // 2) 매핑된 친절한 알림
      const mapped = mapWithdrawError(rawMsg, minWithdraw);
      notify.error(mapped.title, { description: mapped.description });

      // 입력 보정
      if (/pin/i.test(rawMsg)) {
        setForm(f => ({ ...f, pin: "" }));
      } else if (/below_min/i.test(rawMsg) || /insufficient_funds/i.test(rawMsg)) {
        setStep(1);
      }
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, submitting, callRpc, finishOk, requireStepUp, minWithdraw]);

  return {
    open, openModal, closeModal,
    step, next, prev,
    form, update, amountNum,
    canNext1, canNext2, canSubmit,
    submitting, submit,
  };
}
