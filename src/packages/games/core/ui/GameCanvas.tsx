import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface GameCanvasHandle {
  ctx: () => CanvasRenderingContext2D | null;
  canvas: () => HTMLCanvasElement | null;
  resize: () => void;
}

export interface GameCanvasProps {
  className?: string;
  aspect?: number;
  /** Cap DPR — devices >2 are clamped to keep fill-rate sane. */
  maxDpr?: number;
}

/**
 * P1-02 GameCanvas — DPR-aware Canvas2D wrapper.
 * Resizes on ResizeObserver + DPR clamp, exposes imperative handle.
 */
export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function GameCanvas({ className, aspect = 16 / 9, maxDpr = 2 }, ref) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const resize = () => {
      const wrap = wrapRef.current;
      const c = canvasRef.current;
      if (!wrap || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = wrap.clientWidth;
      const h = w / aspect;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      const ctx = c.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    useImperativeHandle(ref, () => ({
      ctx: () => canvasRef.current?.getContext("2d") ?? null,
      canvas: () => canvasRef.current,
      resize,
    }));

    useEffect(() => {
      if (typeof window === "undefined") return;
      resize();
      const ro = new ResizeObserver(resize);
      if (wrapRef.current) ro.observe(wrapRef.current);
      return () => ro.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aspect, maxDpr]);

    return (
      <div ref={wrapRef} className={cn("relative w-full", className)}>
        <canvas
          ref={canvasRef}
          className="block w-full h-auto rounded-xl"
          aria-hidden
        />
      </div>
    );
  },
);
