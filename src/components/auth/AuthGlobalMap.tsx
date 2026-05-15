import { useEffect, useRef, useState } from "react";
import { Globe2 } from "lucide-react";
import { COUNTRY_LAT_LNG, projectLatLng } from "@/lib/countryLatLng";
import { flagSvgUrl } from "@/lib/countryFlag";
import type { LiveFeedItem } from "@/hooks/use-auth-live-data";

interface Props { feed: LiveFeedItem[] }

interface Pulse { id: string; xPct: number; yPct: number; cc: string; nick: string; ts: number }

const MAX_PULSES = 6;
const PULSE_MS = 2200;

export default function AuthGlobalMap({ feed }: Props) {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const seedRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());

  // Seed initial 6 pulses from feed so the map is never blank
  useEffect(() => {
    if (seedRef.current || feed.length === 0) return;
    seedRef.current = true;
    const initial: Pulse[] = feed.slice(0, MAX_PULSES).map((it) => {
      const ll = COUNTRY_LAT_LNG[it.cc] ?? COUNTRY_LAT_LNG.KR;
      const p = projectLatLng(ll.lat, ll.lng);
      seenRef.current.add(it.id);
      return { id: it.id, xPct: p.xPct, yPct: p.yPct, cc: it.cc, nick: it.nick, ts: Date.now() };
    });
    setPulses(initial);
  }, [feed]);

  // Drive pulses from feed updates
  useEffect(() => {
    if (!feed.length) return;
    const latest = feed[0];
    if (seenRef.current.has(latest.id)) return;
    seenRef.current.add(latest.id);
    const ll = COUNTRY_LAT_LNG[latest.cc];
    if (!ll) return;
    const p = projectLatLng(ll.lat, ll.lng);
    const pulse: Pulse = { id: latest.id, xPct: p.xPct, yPct: p.yPct, cc: latest.cc, nick: latest.nick, ts: Date.now() };
    setPulses((prev) => [...prev.slice(-(MAX_PULSES - 1)), pulse]);
  }, [feed]);

  // Auto-prune old pulses
  useEffect(() => {
    if (pulses.length === 0) return;
    const t = setInterval(() => {
      const now = Date.now();
      setPulses((prev) => prev.filter((p) => now - p.ts < PULSE_MS + 1500));
    }, 1000);
    return () => clearInterval(t);
  }, [pulses.length]);

  return (
    <div className="relative rounded-2xl border border-gold/35 bg-background/95 overflow-hidden">
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

      {/* Map area */}
      <div className="relative h-[200px] sm:h-[240px] lg:h-[260px] w-full overflow-hidden">
        <style>{`
          @keyframes auth-pulse-ring {
            0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0.95; }
            100% { transform: translate(-50%, -50%) scale(3.6); opacity: 0; }
          }
          @keyframes auth-pulse-chip {
            0%   { transform: translate(-50%, -130%) scale(0.7); opacity: 0; }
            20%  { transform: translate(-50%, -150%) scale(1);   opacity: 1; }
            85%  { transform: translate(-50%, -150%) scale(1);   opacity: 1; }
            100% { transform: translate(-50%, -180%) scale(0.95); opacity: 0; }
          }
        `}</style>

        {/* world dot pattern */}
        <div
          className="absolute inset-0 opacity-55"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--gold)/0.6) 1px, transparent 1.4px)",
            backgroundSize: "9px 9px",
            maskImage: "radial-gradient(ellipse 75% 70% at center, black 60%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 70% at center, black 60%, transparent 100%)",
          }}
        />
        {/* continental warm glows (Asia / Europe / Americas / Oceania) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 78% 42%, hsl(var(--gold)/0.20), transparent 26%)," +
              "radial-gradient(circle at 53% 35%, hsl(var(--gold)/0.16), transparent 24%)," +
              "radial-gradient(circle at 27% 45%, hsl(var(--gold)/0.18), transparent 26%)," +
              "radial-gradient(circle at 30% 70%, hsl(var(--gold)/0.10), transparent 26%)," +
              "radial-gradient(circle at 85% 78%, hsl(var(--gold)/0.10), transparent 22%)",
          }}
        />

        {/* pulses */}
        {pulses.map((p) => {
          const url = flagSvgUrl(p.cc, 40);
          return (
            <div
              key={p.id}
              className="pointer-events-none absolute"
              style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
            >
              <span
                className="absolute h-2.5 w-2.5 rounded-full bg-gold"
                style={{
                  left: 0, top: 0,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 0 2px hsl(var(--gold)), 0 0 18px hsl(var(--gold))",
                  animation: "auth-pulse-ring 1.8s ease-out forwards",
                }}
              />
              <span
                className="absolute inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/90 border border-gold/50 text-[9px] font-bold text-foreground/90 whitespace-nowrap"
                style={{
                  left: 0, top: 0,
                  animation: "auth-pulse-chip 2.4s ease-out forwards",
                }}
              >
                {url && (
                  <img src={url} width={12} height={8} loading="lazy" decoding="async" alt="" className="rounded-[1px]" />
                )}
                <span className="max-w-[64px] truncate">{p.nick}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
