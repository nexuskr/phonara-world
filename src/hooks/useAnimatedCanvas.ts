// useAnimatedCanvas — Signature Slot 배경 캔버스용 공용 RAF 매니저.
// - 60fps cap, dpr=1 (모바일 GPU 보호)
// - visibilitychange / prefers-reduced-motion / ResizeObserver / cleanup 자동
// - setupFn은 resize/seed 시점마다 호출되고 영속 state를 리턴
// - drawFn은 매 프레임 호출 (caller가 clear/fade 정책 결정)
// - drawStaticFn(옵션) 제공 시 reduced-motion 환경에서 1회만 호출
import { useEffect, useRef, type RefObject } from "react";

export type Canvas2DCtx = CanvasRenderingContext2D;

export interface AnimatedCanvasOptions<S> {
  /** 초당 프레임 상한 (기본 60). */
  fpsCap?: number;
  /** devicePixelRatio override (기본 1 — 모바일 배터리 보호). */
  dpr?: number;
  /** 탭 비활성 시 RAF 일시정지 (기본 true). */
  pauseOnHidden?: boolean;
  /** prefers-reduced-motion 환경에서 1회만 그릴 정적 페인트. */
  drawStaticFn?: (ctx: Canvas2DCtx, w: number, h: number, state: S) => void;
}

/**
 * 60fps capped requestAnimationFrame 루프 + visibility/dpr/RO/cleanup 자동화.
 * @param setupFn  resize 시 호출. 영속 state(파티클 풀 등) 반환.
 * @param drawFn   매 프레임 호출. clear/fade 정책은 호출자가 결정.
 */
export function useAnimatedCanvas<S>(
  setupFn: (ctx: Canvas2DCtx, w: number, h: number) => S,
  drawFn: (ctx: Canvas2DCtx, w: number, h: number, t: number, state: S) => void,
  options: AnimatedCanvasOptions<S> = {}
): RefObject<HTMLCanvasElement> {
  const ref = useRef<HTMLCanvasElement>(null);
  // setup/draw refs로 안정화 — 소비측에서 inline lambda 써도 effect 재실행 안 됨
  const setupRef = useRef(setupFn);
  const drawRef = useRef(drawFn);
  const staticRef = useRef(options.drawStaticFn);
  setupRef.current = setupFn;
  drawRef.current = drawFn;
  staticRef.current = options.drawStaticFn;

  const fpsCap = options.fpsCap ?? 60;
  const dpr = options.dpr ?? 1;
  const pauseOnHidden = options.pauseOnHidden ?? true;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const FRAME_MS = 1000 / Math.max(1, fpsCap);

    let raf = 0;
    let running = true;
    let w = 0, h = 0;
    let last = 0;
    let state: S | null = null;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      state = setupRef.current(ctx, w, h);
    };

    const tick = (t: number) => {
      if (!running) return;
      if (t - last < FRAME_MS) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      last = t;
      if (state !== null) drawRef.current(ctx, w, h, t, state);
      raf = window.requestAnimationFrame(tick);
    };

    const paintStatic = () => {
      if (state !== null && staticRef.current) staticRef.current(ctx, w, h, state);
    };

    const start = () => {
      if (raf) return;
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVis = () => {
      if (!pauseOnHidden) return;
      if (document.hidden) stop();
      else if (!reduced) start();
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) paintStatic();
    });
    ro.observe(canvas);

    resize();
    if (reduced) {
      paintStatic();
    } else {
      start();
    }
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
    };
  }, [fpsCap, dpr, pauseOnHidden]);

  return ref;
}

/** 캔버스 표준 스타일 — absolute, pointer-events-none, GPU layer 강제. */
export const ANIMATED_CANVAS_STYLE = {
  position: "absolute" as const,
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none" as const,
  willChange: "transform",
  transform: "translate3d(0,0,0)",
};
