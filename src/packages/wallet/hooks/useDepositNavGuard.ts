/**
 * useDepositNavGuard — 진행 중 입금이 있을 때 라우트/탭/모달 이탈 보호.
 *
 * - beforeunload: 새로고침/탭 닫기 confirm.
 * - 모달 close 시 confirm 분기는 호출부(useDeposit)에서 처리.
 */
import { useEffect } from "react";
import { g } from "@pkg/core/i18n/glossary";

export function useDepositNavGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom strings; just present the prompt.
      e.returnValue = g("depositLeaveConfirm");
      return g("depositLeaveConfirm");
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}

/** 모달 닫기 confirm helper. */
export function confirmLeave(): boolean {
  // eslint-disable-next-line no-alert
  return window.confirm(g("depositLeaveConfirm"));
}
