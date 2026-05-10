import { useCallback, useRef, useState } from "react";

/**
 * Imperative step-up flow:
 *   const { dialogProps, requireStepUp } = useStepUp();
 *   ...
 *   const ok = await requireStepUp("출금");
 *   if (!ok) return;
 *
 * Renders <StepUpGate {...dialogProps} /> somewhere in the component.
 */
export function useStepUp() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<string>("민감 작업");
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const requireStepUp = useCallback((label?: string): Promise<boolean> => {
    setScope(label ?? "민감 작업");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const verified = useCallback(() => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  return {
    requireStepUp,
    dialogProps: { open, scope, onClose: close, onVerified: verified },
  };
}
