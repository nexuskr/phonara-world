import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useLongPress — pointer-based long-press / short-tap dual action.
 * - onShort: fired on pointerup if timer hasn't elapsed
 * - onLong:  fired when held for `ms` (default 600)
 * - returns `bind` (spread on element) + `pressing` (true while held)
 *
 * Pure DOM, no framer/gesture deps. ~1KB.
 */
export function useLongPress<T extends HTMLElement = HTMLElement>(opts: {
  onShort?: () => void;
  onLong?: () => void;
  ms?: number;
}) {
  const { onShort, onLong, ms = 600 } = opts;
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const [pressing, setPressing] = useState(false);

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clear(), [clear]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<T>) => {
      // ignore right-click / middle
      if (e.button !== 0 && e.pointerType === "mouse") return;
      firedRef.current = false;
      setPressing(true);
      clear();
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        setPressing(false);
        onLong?.();
      }, ms);
    },
    [clear, ms, onLong],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<T>) => {
      const fired = firedRef.current;
      clear();
      setPressing(false);
      if (!fired) {
        // short tap
        onShort?.();
      }
      // prevent ghost click after long fire
      if (fired) e.preventDefault();
    },
    [clear, onShort],
  );

  const cancel = useCallback(() => {
    clear();
    setPressing(false);
    firedRef.current = false;
  }, [clear]);

  const onContextMenu = useCallback((e: React.MouseEvent<T>) => {
    // block mobile long-press context menu and trigger long-press action instead
    e.preventDefault();
    e.stopPropagation();
    // treat context-menu as a long-press
    if (!firedRef.current) {
      firedRef.current = true;
      setPressing(false);
      onLong?.();
    }
  }, [onLong]);

  return {
    pressing,
    bind: {
      onPointerDown,
      onPointerUp,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu,
    },
  };
}

export default useLongPress;
