import { useEffect, useRef } from "react";
import { ObjectPool, type Poolable } from "../engine/objectPool";
import { useGameFrame } from "../hooks/useGameFrame";
import { prefersReducedMotion } from "@/lib/haptics";
import { cn } from "@/lib/utils";

class Particle implements Poolable {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  ttl = 0;
  reset() {
    this.x = this.y = this.vx = this.vy = this.life = this.ttl = 0;
  }
}

export interface PayoutBurstProps {
  /** Increment this to fire a new burst. */
  triggerKey: number | string;
  className?: string;
  /** "low" disables particles entirely (CSS pulse only). */
  tier?: "low" | "mid" | "high";
}

/**
 * P1-05 PayoutBurst — object-pooled particle burst with prefers-reduced-motion fallback.
 */
export function PayoutBurst({ triggerKey, className, tier = "mid" }: PayoutBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poolRef = useRef<ObjectPool<Particle> | null>(null);
  const activeRef = useRef<Particle[]>([]);
  const fireRef = useRef(0);

  if (!poolRef.current) poolRef.current = new ObjectPool(() => new Particle(), 64);

  useEffect(() => {
    if (tier === "low" || prefersReducedMotion()) return;
    const max = tier === "high" ? 80 : 40;
    const cx = (canvasRef.current?.width ?? 0) / 2;
    const cy = (canvasRef.current?.height ?? 0) / 2;
    for (let i = 0; i < max; i++) {
      const p = poolRef.current!.acquire();
      p.x = cx;
      p.y = cy;
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 220;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 60;
      p.ttl = 700 + Math.random() * 500;
      p.life = 0;
      activeRef.current.push(p);
    }
    fireRef.current = performance.now();
  }, [triggerKey, tier]);

  useGameFrame((dt) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (tier === "low") return;
    const list = activeRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life += dt;
      if (p.life > p.ttl) {
        poolRef.current!.release(p);
        list.splice(i, 1);
        continue;
      }
      p.vy += 220 * (dt / 1000);
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      const alpha = 1 - p.life / p.ttl;
      ctx.fillStyle = `hsla(var(--primary) / ${alpha.toFixed(3)})`;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
  }, activeRef.current.length === 0);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        tier !== "low" && "mid:opacity-100 high:opacity-100",
        className,
      )}
    />
  );
}
