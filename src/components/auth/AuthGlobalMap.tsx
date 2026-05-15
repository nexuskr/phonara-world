import { memo, useMemo } from "react";
import { Globe2 } from "lucide-react";
import { COUNTRY_LAT_LNG, projectLatLng } from "@/lib/countryLatLng";
import { flagSvgUrl } from "@/lib/countryFlag";
import type { LiveFeedItem } from "@/hooks/use-auth-live-data";

interface Props { feed: LiveFeedItem[] }

const STATIC_NODES = [
  "KR", "JP", "CN", "SG", "TH", "IN", "AE", "TR", "DE", "GB", "FR", "US", "CA", "BR", "AU", "ZA",
] as const;

function AuthGlobalMap({ feed }: Props) {
  const liveMarkers = useMemo(() => {
    const source = (feed.length > 0 ? feed : [{ id: "seed-kr", cc: "KR", nick: "김PHON" }, { id: "seed-us", cc: "US", nick: "NY Apex" }, { id: "seed-de", cc: "DE", nick: "Berlin Lord" }, { id: "seed-sg", cc: "SG", nick: "SG Master" }])
      .slice(0, 6);

    return source.map((item, index) => {
      const ll = COUNTRY_LAT_LNG[item.cc] ?? COUNTRY_LAT_LNG.KR;
      const p = projectLatLng(ll.lat, ll.lng);
      return {
        id: item.id,
        cc: item.cc,
        nick: item.nick,
        xPct: p.xPct,
        yPct: p.yPct,
        delay: `${index * 0.45}s`,
        flagUrl: flagSvgUrl(item.cc, 40),
      };
    });
  }, [feed]);

  const staticNodes = useMemo(
    () => STATIC_NODES.map((cc) => {
      const ll = COUNTRY_LAT_LNG[cc];
      const p = projectLatLng(ll.lat, ll.lng);
      return { cc, xPct: p.xPct, yPct: p.yPct };
    }),
    [],
  );

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
      <div className="relative h-[200px] sm:h-[240px] lg:h-[260px] w-full overflow-hidden bg-[radial-gradient(circle_at_50%_46%,hsl(var(--gold)/0.08),transparent_54%)]">
        <style>{`
          @keyframes auth-map-live {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.95; }
            50% { transform: translate(-50%, -50%) scale(1.14); opacity: 1; }
          }
          @keyframes auth-map-chip {
            0%, 100% { transform: translate(-50%, -145%); opacity: 0.84; }
            50% { transform: translate(-50%, -152%); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            .auth-map-live, .auth-map-chip { animation: none !important; }
          }
        `}</style>

        <svg
          viewBox="0 0 1000 420"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="empire-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.15" fill="hsl(var(--gold) / 0.28)" />
            </pattern>
            <filter id="empire-glow">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="1000" height="420" fill="url(#empire-grid)" opacity="0.85" />

          <g fill="hsl(var(--gold) / 0.10)" stroke="hsl(var(--gold) / 0.26)" strokeWidth="1.4" filter="url(#empire-glow)">
            <path d="M76 119c21-24 57-41 95-47 44-7 88 1 122 20 17 10 26 28 34 47 7 15 19 22 34 28 15 6 19 19 12 30-9 14-26 16-42 17-32 3-64 1-93 15-33 15-63 39-98 40-31 2-67-11-81-39-13-25-3-54 10-80 9-18 4-23-8-31-13-8-15-19-6-30 5-7 12-12 21-18z" />
            <path d="M309 292c14-12 33-17 50-14 18 2 31 12 37 27 6 14-5 24-17 31-16 10-35 18-54 15-16-3-28-13-30-28-1-12 5-22 14-31z" />
            <path d="M441 103c29-20 69-31 107-29 31 1 61 11 81 29 16 14 16 31 24 45 7 13 22 21 41 25 17 5 27 16 26 29-2 15-17 22-34 25-34 5-67 2-93 16-24 12-35 36-57 49-18 11-46 18-67 13-21-5-30-21-33-39-3-19-14-33-36-42-18-8-26-20-23-34 4-17 23-25 40-31 9-4 17-9 24-17z" />
            <path d="M538 250c21-12 46-14 65-5 16 8 21 22 15 36-6 15-23 25-41 31-24 9-56 7-72-7-16-14-10-36 9-48 7-4 15-6 24-7z" />
            <path d="M682 110c19-18 52-32 88-37 49-7 98 2 136 22 24 13 39 32 43 55 4 21-10 34-33 37-24 4-49 0-68 9-17 7-31 21-47 32-20 13-47 21-73 21-34 0-68-14-82-39-12-22-7-52 13-73 7-8 15-18 23-27z" />
            <path d="M820 285c19-13 44-21 64-18 20 3 31 15 29 30-2 14-15 24-32 29-24 8-55 7-72-4-18-12-13-29 11-37z" />
          </g>

          {staticNodes.map((node) => (
            <circle
              key={node.cc}
              cx={(node.xPct / 100) * 1000}
              cy={(node.yPct / 100) * 420}
              r="2.1"
              fill="hsl(var(--gold) / 0.82)"
              opacity="0.8"
            />
          ))}
        </svg>

        {liveMarkers.map((p, index) => {
          return (
            <div
              key={p.id}
              className="pointer-events-none absolute"
              style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
            >
              <span
                className="auth-map-live absolute h-2.5 w-2.5 rounded-full bg-gold"
                style={{
                  left: 0, top: 0,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 0 2px hsl(var(--gold) / 0.85), 0 0 14px hsl(var(--gold) / 0.55)",
                  animation: `auth-map-live 2.8s ease-in-out infinite`,
                  animationDelay: p.delay,
                }}
              />
              {index < 4 && (
                <span
                  className="auth-map-chip absolute inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/92 border border-gold/45 text-[9px] font-bold text-foreground/90 whitespace-nowrap"
                  style={{
                    left: 0, top: 0,
                    animation: `auth-map-chip 2.8s ease-in-out infinite`,
                    animationDelay: p.delay,
                  }}
                >
                  {p.flagUrl && (
                    <img src={p.flagUrl} width={12} height={8} loading="lazy" decoding="async" alt="" className="rounded-[1px]" />
                  )}
                  <span className="max-w-[64px] truncate">{p.nick}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(AuthGlobalMap);
