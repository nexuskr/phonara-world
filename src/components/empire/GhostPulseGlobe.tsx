import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SimChip } from "@/components/sim/SimChip";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Pulse = {
  region_pulses: Record<string, number>;
};

// Rough world-map coords (x:0-100, y:0-100)
const PINS: Array<{ code: string; x: number; y: number; label: string }> = [
  { code: "KR", x: 81, y: 38, label: "한국" },
  { code: "JP", x: 84, y: 40, label: "일본" },
  { code: "VN", x: 75, y: 53, label: "베트남" },
  { code: "TH", x: 73, y: 52, label: "태국" },
  { code: "ID", x: 78, y: 62, label: "인도네시아" },
  { code: "IN", x: 67, y: 47, label: "인도" },
  { code: "US", x: 22, y: 40, label: "미국" },
  { code: "BR", x: 35, y: 65, label: "브라질" },
];

export default function GhostPulseGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const prevRef = useRef<Record<string, number>>({});
  const flashRef = useRef<Record<string, number>>({}); // last flash time per region

  useEffect(() => {
    let alive = true;
    async function fetchOnce() {
      const { data } = await supabase.rpc("get_ghost_pulse");
      if (!alive || !data) return;
      const p = data as unknown as Pulse;
      const next = p.region_pulses ?? {};
      // Detect rises → trigger flash
      const now = performance.now();
      for (const k of Object.keys(next)) {
        if ((next[k] ?? 0) > (prevRef.current[k] ?? 0)) {
          flashRef.current[k] = now;
        }
      }
      prevRef.current = next;
      setPulses(next);
    }
    fetchOnce();
    const id = setVisibleInterval(() => {
      if (!document.hidden) fetchOnce();
    }, 2500 , { meta: { owner: "GhostPulseGlobe", category: "cosmetic" } });
    return () => {
      alive = false;
      id();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let last = 0;

    function resize() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(t: number) {
      if (!canvas || !ctx) return;
      // Pause entirely when tab is hidden.
      if (document.hidden) { raf = 0; return; }
      // Throttle to 30fps
      if (t - last < 33) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = t;

      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);

      // soft globe halo
      const cx = r.width / 2;
      const cy = r.height / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(r.width, r.height) * 0.55);
      grad.addColorStop(0, "rgba(245, 158, 11, 0.10)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, r.width, r.height);

      // grid lines (very faint)
      ctx.strokeStyle = "rgba(120,140,180,0.08)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const y = (r.height * i) / 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(r.width, y);
        ctx.stroke();
      }
      for (let i = 1; i < 8; i++) {
        const x = (r.width * i) / 8;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, r.height);
        ctx.stroke();
      }

      // pins
      const now = performance.now();
      for (const p of PINS) {
        const px = (p.x / 100) * r.width;
        const py = (p.y / 100) * r.height;
        const flashAge = now - (flashRef.current[p.code] ?? -10000);
        const flashing = flashAge < 800;
        const flashAlpha = flashing ? 1 - flashAge / 800 : 0;

        // pulse ring
        const ringT = ((now / 1400) + (PINS.indexOf(p) * 0.1)) % 1;
        const ringR = 6 + ringT * 18;
        ctx.beginPath();
        ctx.arc(px, py, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245,158,11,${(1 - ringT) * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // dot
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = flashing ? `rgba(253,224,71,${0.7 + flashAlpha * 0.3})` : "rgba(245,158,11,0.85)";
        ctx.fill();

        // flash burst
        if (flashing) {
          ctx.beginPath();
          ctx.arc(px, py, 6 + flashAge / 30, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(253,224,71,${flashAlpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    const onVis = () => {
      if (!document.hidden && !raf) { last = 0; raf = requestAnimationFrame(draw); }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const total = Object.values(pulses).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="relative w-full rounded-2xl border border-sim-gold/30 bg-gradient-to-b from-slate-950/60 to-amber-950/20 overflow-hidden">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <SimChip />
        <span className="text-[10px] tracking-[0.2em] uppercase text-sim-gold font-imperial">
          Empire Pulse · Live
        </span>
      </div>
      <div className="absolute top-2 right-3 z-10 text-[11px] tabular-nums text-amber-200/80">
        총 활동 {total.toLocaleString("ko-KR")}
      </div>
      <canvas ref={canvasRef} className="block w-full h-[200px] sm:h-[260px]" aria-label="Empire global pulse map" />
      <div className="absolute bottom-2 left-3 right-3 z-10 grid grid-cols-4 sm:grid-cols-8 gap-1 text-[10px] text-muted-foreground">
        {PINS.map((p) => (
          <div key={p.code} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sim-gold/80" />
            <span className="truncate">{p.label}</span>
            <span className="ml-auto tabular-nums text-amber-200/90">
              {(pulses[p.code] ?? 0).toLocaleString("ko-KR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
