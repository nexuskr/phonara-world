import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { COUNTRY_LAT_LNG, projectLatLng } from "@/lib/countryLatLng";
import type { LiveFeedItem } from "@/hooks/use-auth-live-data";

interface Props { feed: LiveFeedItem[] }

interface Pulse { id: string; xPct: number; yPct: number; }

export default function AuthGlobalMap({ feed }: Props) {
  const [pulses, setPulses] = useState<Pulse[]>([]);

  // Drive pulses from feed updates — newest only, capped, auto-prune
  useEffect(() => {
    if (!feed.length) return;
    const latest = feed[0];
    const ll = COUNTRY_LAT_LNG[latest.cc];
    if (!ll) return;
    const p = projectLatLng(ll.lat, ll.lng);
    const id = latest.id;
    setPulses((prev) => [...prev.slice(-5), { id, xPct: p.xPct, yPct: p.yPct }]);
    const t = setTimeout(() => {
      setPulses((prev) => prev.filter((x) => x.id !== id));
    }, 1800);
    return () => clearTimeout(t);
  }, [feed]);

  return (
    <div className="relative rounded-2xl border border-gold/35 bg-background/75 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gold/20">
        <div className="inline-flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] font-black tracking-[0.28em] text-foreground">GLOBAL EMPIRE MAP</span>
        </div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-[9px] font-black tracking-widest text-red-400">
          <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Map area — pure CSS dot pattern */}
      <div className="relative h-[160px] sm:h-[200px] lg:h-[220px] w-full overflow-hidden">
        <style>{`
          @keyframes auth-pulse-ring {
            0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0.95; }
            100% { transform: translate(-50%, -50%) scale(3.4); opacity: 0; }
          }
        `}</style>
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--gold)/0.55) 1px, transparent 1.4px)",
            backgroundSize: "10px 10px",
            maskImage:
              "radial-gradient(ellipse at center, black 60%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 60%, transparent 100%)",
          }}
        />
        {/* warm glow centers */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 22% 60%, hsl(var(--gold)/0.18), transparent 30%), radial-gradient(circle at 75% 40%, hsl(var(--gold)/0.18), transparent 32%), radial-gradient(circle at 50% 75%, hsl(var(--gold)/0.10), transparent 30%)",
          }}
        />
        {/* pulses */}
        {pulses.map((p) => (
          <span
            key={p.id}
            className="absolute h-2.5 w-2.5 rounded-full bg-gold pointer-events-none"
            style={{
              left: `${p.xPct}%`,
              top: `${p.yPct}%`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 0 2px hsl(var(--gold)), 0 0 18px hsl(var(--gold))",
              animation: "auth-pulse-ring 1.6s ease-out forwards",
            }}
          />
        ))}
      </div>
    </div>
  );
}
