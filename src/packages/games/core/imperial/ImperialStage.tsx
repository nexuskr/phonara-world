/**
 * ImperialStage — 16:9 canvas shell with corner shine, grid wash,
 * viewport pause, dpr cap 2. All Imperial game canvases mount inside.
 */
import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from "react";
import { useViewportPause } from "@pkg/games/core";

export interface StageHandle {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  dpr: number;
}

interface Props {
  onFrame: (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, dt: number) => void;
  aspect?: string;
  className?: string;
  children?: React.ReactNode;
}

function ImperialStageImpl(
  { onFrame, aspect = "aspect-[16/9]", className = "", children }: Props,
  ref: React.Ref<StageHandle>,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dprRef = useRef(1);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const onFrameRef = useRef(onFrame);
  useEffect(() => { onFrameRef.current = onFrame; }, [onFrame]);

  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    ctx: ctxRef.current,
    dpr: dprRef.current,
  }), []);

  const { ref: pauseRef, paused } = useViewportPause<HTMLDivElement>();
  const visible = !paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    ctxRef.current = ctx;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = wrap;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      onFrameRef.current(ctx, canvas.width, canvas.height, dpr, dt);
      raf = requestAnimationFrame(tick);
    };
    if (visible) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [visible]);

  return (
    <div
      ref={(el) => {
        wrapRef.current = el;
        pauseRef.current = el;
      }}
      className={`relative w-full ${aspect} rounded-2xl overflow-hidden border border-[hsl(var(--gold))]/30 bg-[hsl(260,50%,6%)] ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsla(45,90%,60%,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsla(340,90%,60%,0.08),transparent_60%)]" />
      {children}
    </div>
  );
}

export const ImperialStage = memo(forwardRef(ImperialStageImpl));
export default ImperialStage;
