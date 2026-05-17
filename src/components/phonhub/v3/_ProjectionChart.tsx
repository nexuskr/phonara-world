type Row = { day: number; yield_phon: number; burn_phon: number };

/**
 * Inline SVG sparkline — no recharts dependency (keeps bundle budget intact).
 */
export default function ProjectionChart({ series }: { series: Row[] }) {
  if (series.length === 0) return null;
  const W = 320, H = 160, PAD = 8;
  const maxY = Math.max(
    1,
    ...series.map((r) => Math.max(r.yield_phon, r.burn_phon)),
  );
  const maxX = series[series.length - 1].day || 1;
  const pt = (v: number, vMax: number, axis: "x" | "y") => {
    const range = axis === "x" ? W - PAD * 2 : H - PAD * 2;
    const base = axis === "x" ? PAD : H - PAD;
    const sign = axis === "x" ? 1 : -1;
    return base + sign * (v / vMax) * range;
  };
  const buildPath = (key: "yield_phon" | "burn_phon") => {
    return series
      .map((r, i) => {
        const x = pt(r.day, maxX, "x");
        const y = pt(r[key], maxY, "y");
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };
  const areaPath = (key: "yield_phon" | "burn_phon") =>
    `${buildPath(key)} L${pt(maxX, maxX, "x").toFixed(1)},${(H - PAD).toFixed(1)} L${pt(0, maxX, "x").toFixed(1)},${(H - PAD).toFixed(1)} Z`;

  const last = series[series.length - 1];

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="grdYield" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grdBurn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--pink))" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(var(--pink))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath("yield_phon")} fill="url(#grdYield)" />
        <path d={areaPath("burn_phon")} fill="url(#grdBurn)" />
        <path d={buildPath("yield_phon")} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <path d={buildPath("burn_phon")} fill="none" stroke="hsl(var(--pink))" strokeWidth="1.5" />
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1 text-[10px]">
        <div className="rounded-md bg-card/80 px-2 py-1 border border-primary/30">
          <span className="text-muted-foreground">D+90 배당</span>{" "}
          <span className="font-bold text-primary tabular-nums">
            {last.yield_phon.toLocaleString("ko-KR")}
          </span>
        </div>
        <div className="rounded-md bg-card/80 px-2 py-1 border border-pink/30">
          <span className="text-muted-foreground">D+90 소각</span>{" "}
          <span className="font-bold text-pink tabular-nums">
            {last.burn_phon.toLocaleString("ko-KR")}
          </span>
        </div>
      </div>
    </div>
  );
}
