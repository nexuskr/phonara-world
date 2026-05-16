/**
 * useDepositDraft — sessionStorage draft resume.
 * Key: phonara:deposit_draft:v1
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "phonara:deposit_draft:v1";

export interface DepositDraft {
  method: "coin" | "bank" | "voucher";
  amount: number;
  intentId: string | null;
  expiresAt: number | null;
  step: 1 | 2 | 3;
  createdAt: number;
}

function read(): DepositDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as DepositDraft;
    if (d.expiresAt && d.expiresAt <= Date.now()) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return d;
  } catch { return null; }
}

export function useDepositDraft() {
  const [resumable, setResumable] = useState<DepositDraft | null>(null);

  useEffect(() => { setResumable(read()); }, []);

  const save = useCallback((d: DepositDraft) => {
    try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* noop */ }
  }, []);

  const clear = useCallback(() => {
    try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
    setResumable(null);
  }, []);

  const dismiss = useCallback(() => setResumable(null), []);

  return { resumable, save, clear, dismiss };
}
