import { useEffect, useState } from "react";

type Region = { key: string; label: string; cx: number; cy: number; tz: string[] };

// A handful of representative regions plotted on a 1000x500 viewBox world map.
// Coordinates are approximate dot positions, not real geo — they convey "global presence"
// while staying lightweight (no external dep, no real PII).
const REGIONS: Region[] = [
  { key: "us-w", label: "Los Angeles",   cx: 165, cy: 195, tz: ["America/Los_Angeles", "America/Vancouver"] },
  { key: "us-e", label: "New York",      cx: 270, cy: 195, tz: ["America/New_York", "America/Toronto"] },
  { key: "br",   label: "São Paulo",     cx: 350, cy: 320, tz: ["America/Sao_Paulo", "America/Argentina/Buenos_Aires"] },
  { key: "uk",   label: "London",        cx: 490, cy: 165, tz: ["Europe/London", "Europe/Dublin"] },
  { key: "eu",   label: "Berlin",        cx: 525, cy: 170, tz: ["Europe/Berlin", "Europe/Paris", "Europe/Madrid", "Europe/Amsterdam"] },
  { key: "ng",   label: "Lagos",         cx: 510, cy: 285, tz: ["Africa/Lagos", "Africa/Cairo"] },
  { key: "ae",   label: "Dubai",         cx: 605, cy: 240, tz: ["Asia/Dubai", "Asia/Riyadh"] },
  { key: "in",   label: "Mumbai",        cx: 680, cy: 250, tz: ["Asia/Kolkata", "Asia/Karachi"] },
  { key: "id",   label: "Jakarta",       cx: 790, cy: 320, tz: ["Asia/Jakarta", "Asia/Singapore", "Asia/Kuala_Lumpur"] },
  { key: "vn",   label: "Ho Chi Minh",   cx: 800, cy: 280, tz: ["Asia/Ho_Chi_Minh", "Asia/Bangkok"] },
  { key: "cn",   label: "Shanghai",      cx: 820, cy: 220, tz: ["Asia/Shanghai", "Asia/Taipei", "Asia/Hong_Kong"] },
  { key: "jp",   label: "Tokyo",         cx: 870, cy: 215, tz: ["Asia/Tokyo"] },
  { key: "kr",   label: "Seoul",         cx: 850, cy: 205, tz: ["Asia/Seoul", "Asia/Pyongyang"] },
  { key: "au",   label: "Sydney",        cx: 880, cy: 380, tz: ["Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland"] },
];

function resolveActiveRegion(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const hit = REGIONS.find((r) => r.tz.includes(tz));
    if (hit) return hit.key;
    // Fallback: pick by tz prefix
    const prefix = tz.split("/")[0];
    if (prefix === "Asia") return "kr";
    if (prefix === "Europe") return "eu";
    if (prefix === "America") return "us-e";
    if (prefix === "Africa") return "ng";
    if (prefix === "Australia" || prefix === "Pacific") return "au";
  } catch {}
  return "kr";
}

/**
 * Lightweight SVG world dot-map for the `/global/live` public page.
 * Highlights the visitor's region (by browser timezone) and pulses other regions.
 * Zero deps, zero PII server-side.
 */
export default function GlobalPresenceMap() {
  const [active, setActive] = useState<string>("kr");

  useEffect(() => {
    setActive(resolveActiveRegion());
  }, []);

  return (
    <div className="glass-strong rounded-3xl p-4 sm:p-6 border border-border/50">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-display font-black text-lg sm:text-xl flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
            </span>
            Global Presence
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            14개 거점 · 실시간 접속 표시 · 당신의 지역이 강조됩니다
          </p>
        </div>
      </div>

      <div className="relative aspect-[2/1] w-full">
        <svg viewBox="0 0 1000 500" className="w-full h-full" aria-hidden="true">
          <defs>
            <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="activeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0.85" />
              <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0" />
            </radialGradient>
            <pattern id="dotgrid" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="hsl(var(--muted-foreground))" opacity="0.18" />
            </pattern>
          </defs>

          {/* Soft dot grid as "world" backdrop */}
          <rect x="0" y="0" width="1000" height="500" fill="url(#dotgrid)" />

          {/* Connection lines from active region to others */}
          {(() => {
            const a = REGIONS.find((r) => r.key === active);
            if (!a) return null;
            return REGIONS.filter((r) => r.key !== active).map((r) => (
              <line
                key={r.key}
                x1={a.cx}
                y1={a.cy}
                x2={r.cx}
                y2={r.cy}
                stroke="hsl(var(--primary))"
                strokeOpacity="0.18"
                strokeWidth="0.6"
                strokeDasharray="2 4"
              />
            ));
          })()}

          {/* Region dots */}
          {REGIONS.map((r) => {
            const isActive = r.key === active;
            return (
              <g key={r.key}>
                <circle
                  cx={r.cx}
                  cy={r.cy}
                  r={isActive ? 28 : 18}
                  fill={isActive ? "url(#activeGlow)" : "url(#dotGlow)"}
                >
                  <animate
                    attributeName="r"
                    values={isActive ? "26;34;26" : "16;22;16"}
                    dur={isActive ? "1.6s" : "2.4s"}
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={r.cx}
                  cy={r.cy}
                  r={isActive ? 4.5 : 3}
                  fill={isActive ? "hsl(var(--gold))" : "hsl(var(--secondary))"}
                />
                <text
                  x={r.cx + 8}
                  y={r.cy - 8}
                  fontSize="11"
                  fontWeight="700"
                  fill={isActive ? "hsl(var(--gold))" : "hsl(var(--muted-foreground))"}
                  opacity={isActive ? 1 : 0.6}
                >
                  {r.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-gold" /> 당신의 지역
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary" /> 글로벌 거점
          </span>
        </div>
        <span className="tabular-nums">
          {(() => {
            try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "—"; }
          })()}
        </span>
      </div>
    </div>
  );
}
