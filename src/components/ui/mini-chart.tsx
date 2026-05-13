/**
 * Mini-chart — recharts를 대체하는 의존성 ZERO SVG 차트 프리미티브.
 *
 * 목표: gzip 페이로드 감소(>90KB), 60fps 보장, admin/trust 패널만 커버.
 * 인터랙션은 hover tooltip 한 가지로만. 애니메이션 없음(즉시 렌더, GPU=0).
 *
 * 컴포넌트: <LineMini>, <AreaMini>, <BarsMini>, <StackedBarsMini>, <DonutMini>.
 */
import { useMemo, useState, type CSSProperties } from "react";

type Datum = Record<string, number | string>;

interface SeriesSpec {
  key: string;
  name?: string;
  color: string; // hsl(var(--…)) or any valid CSS color
}

interface BaseProps {
  data: Datum[];
  xKey: string;
  series: SeriesSpec[];
  height?: number;
  yFormatter?: (v: number) => string;
  xFormatter?: (v: any) => string;
  yDomain?: [number, number];
  className?: string;
}

const PAD = { l: 36, r: 8, t: 8, b: 22 };

function computeY(values: number[], explicit?: [number, number]): [number, number] {
  if (explicit) return explicit;
  if (!values.length) return [0, 1];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.08;
  return [min === 0 ? 0 : min - pad, max + pad];
}

function fmtCompact(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function Tip({ x, y, items, label }: { x: number; y: number; items: { c: string; n: string; v: string }[]; label: string }) {
  const style: CSSProperties = {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    transform: "translate(-50%, -110%)",
    pointerEvents: "none",
  };
  return (
    <div style={style} className="z-10 rounded-md border border-border bg-card/95 px-2 py-1.5 text-[10px] backdrop-blur-md shadow-md">
      <div className="font-bold mb-0.5">{label}</div>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: it.c }} />
          <span className="text-muted-foreground">{it.n}:</span>
          <span className="font-bold">{it.v}</span>
        </div>
      ))}
    </div>
  );
}

function useChart(props: BaseProps & { width: number }) {
  const { data, xKey, series, width, height = 180, yFormatter = fmtCompact, yDomain } = props;
  const innerW = Math.max(1, width - PAD.l - PAD.r);
  const innerH = Math.max(1, height - PAD.t - PAD.b);
  const allY = useMemo(
    () => series.flatMap((s) => data.map((d) => Number(d[s.key] ?? 0))),
    [data, series],
  );
  const [yMin, yMax] = useMemo(() => computeY(allY, yDomain), [allY, yDomain]);
  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / steps);
  }, [yMin, yMax]);
  const xPos = (i: number) => (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yPos = (v: number) => innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
  return { innerW, innerH, yMin, yMax, yTicks, xPos, yPos, yFormatter };
}

function Container({ children, className, height = 180 }: { children: (w: number) => React.ReactNode; className?: string; height?: number }) {
  // Use ResizeObserver-free approach: 100% width with svg viewBox would lose pixel alignment;
  // instead, set width via CSS and read on first paint via clientWidth ref.
  const [w, setW] = useState(640);
  return (
    <div
      ref={(el) => { if (el && Math.abs(el.clientWidth - w) > 2) setW(el.clientWidth); }}
      className={"relative w-full " + (className ?? "")}
      style={{ height }}
    >
      {children(w)}
    </div>
  );
}

/* ───────────────────────── LineMini ───────────────────────── */
export function LineMini(props: BaseProps) {
  const { data, xKey, series, height = 180, xFormatter = (v) => String(v) } = props;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Container height={height}>
      {(width) => {
        const c = useChart({ ...props, width });
        return (
          <>
            <svg width={width} height={height} className="block">
              <g transform={`translate(${PAD.l},${PAD.t})`}>
                {c.yTicks.map((t, i) => (
                  <g key={i}>
                    <line x1={0} x2={c.innerW} y1={c.yPos(t)} y2={c.yPos(t)} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                    <text x={-6} y={c.yPos(t) + 3} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{c.yFormatter(t)}</text>
                  </g>
                ))}
                {data.map((d, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
                  <text key={i} x={c.xPos(i)} y={c.innerH + 14} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                    {xFormatter(d[xKey])}
                  </text>
                ))}
                {series.map((s) => {
                  const path = data
                    .map((d, i) => `${i === 0 ? "M" : "L"} ${c.xPos(i)} ${c.yPos(Number(d[s.key] ?? 0))}`)
                    .join(" ");
                  return <path key={s.key} d={path} fill="none" stroke={s.color} strokeWidth={2} />;
                })}
                {hover !== null && (
                  <line x1={c.xPos(hover)} x2={c.xPos(hover)} y1={0} y2={c.innerH} stroke="hsl(var(--primary))" strokeOpacity={0.4} />
                )}
                <rect
                  x={0} y={0} width={c.innerW} height={c.innerH} fill="transparent"
                  onMouseMove={(e) => {
                    const r = (e.target as SVGRectElement).getBoundingClientRect();
                    const px = e.clientX - r.left;
                    const i = Math.round((px / r.width) * (data.length - 1));
                    setHover(Math.max(0, Math.min(data.length - 1, i)));
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            </svg>
            {hover !== null && data[hover] && (
              <Tip
                x={PAD.l + c.xPos(hover)}
                y={PAD.t}
                label={xFormatter(data[hover][xKey])}
                items={series.map((s) => ({ c: s.color, n: s.name ?? s.key, v: c.yFormatter(Number(data[hover][s.key] ?? 0)) }))}
              />
            )}
          </>
        );
      }}
    </Container>
  );
}

/* ───────────────────────── AreaMini ───────────────────────── */
export function AreaMini(props: BaseProps) {
  const { data, xKey, series, height = 180, xFormatter = (v) => String(v) } = props;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Container height={height}>
      {(width) => {
        const c = useChart({ ...props, width });
        return (
          <>
            <svg width={width} height={height} className="block">
              <defs>
                {series.map((s, i) => (
                  <linearGradient key={i} id={`area-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                  </linearGradient>
                ))}
              </defs>
              <g transform={`translate(${PAD.l},${PAD.t})`}>
                {c.yTicks.map((t, i) => (
                  <g key={i}>
                    <line x1={0} x2={c.innerW} y1={c.yPos(t)} y2={c.yPos(t)} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                    <text x={-6} y={c.yPos(t) + 3} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{c.yFormatter(t)}</text>
                  </g>
                ))}
                {data.map((d, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
                  <text key={i} x={c.xPos(i)} y={c.innerH + 14} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                    {xFormatter(d[xKey])}
                  </text>
                ))}
                {series.map((s, idx) => {
                  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${c.xPos(i)} ${c.yPos(Number(d[s.key] ?? 0))}`).join(" ");
                  const areaPath = `${linePath} L ${c.xPos(data.length - 1)} ${c.innerH} L ${c.xPos(0)} ${c.innerH} Z`;
                  return (
                    <g key={s.key}>
                      <path d={areaPath} fill={`url(#area-grad-${idx})`} />
                      <path d={linePath} fill="none" stroke={s.color} strokeWidth={2} />
                    </g>
                  );
                })}
                <rect
                  x={0} y={0} width={c.innerW} height={c.innerH} fill="transparent"
                  onMouseMove={(e) => {
                    const r = (e.target as SVGRectElement).getBoundingClientRect();
                    const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
                    setHover(Math.max(0, Math.min(data.length - 1, i)));
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            </svg>
            {hover !== null && data[hover] && (
              <Tip
                x={PAD.l + c.xPos(hover)}
                y={PAD.t}
                label={xFormatter(data[hover][xKey])}
                items={series.map((s) => ({ c: s.color, n: s.name ?? s.key, v: c.yFormatter(Number(data[hover][s.key] ?? 0)) }))}
              />
            )}
          </>
        );
      }}
    </Container>
  );
}

/* ───────────────────────── BarsMini (grouped) ───────────────────────── */
export function BarsMini(props: BaseProps) {
  const { data, xKey, series, height = 180, xFormatter = (v) => String(v) } = props;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Container height={height}>
      {(width) => {
        const c = useChart({ ...props, width });
        const groupW = c.innerW / Math.max(1, data.length);
        const barW = Math.max(2, (groupW * 0.7) / series.length);
        return (
          <>
            <svg width={width} height={height} className="block">
              <g transform={`translate(${PAD.l},${PAD.t})`}>
                {c.yTicks.map((t, i) => (
                  <g key={i}>
                    <line x1={0} x2={c.innerW} y1={c.yPos(t)} y2={c.yPos(t)} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                    <text x={-6} y={c.yPos(t) + 3} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{c.yFormatter(t)}</text>
                  </g>
                ))}
                {data.map((d, i) => (
                  <g key={i}>
                    <text x={i * groupW + groupW / 2} y={c.innerH + 14} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                      {xFormatter(d[xKey])}
                    </text>
                    {series.map((s, j) => {
                      const v = Number(d[s.key] ?? 0);
                      const y = c.yPos(Math.max(v, 0));
                      const h = Math.max(0, c.yPos(0) - y);
                      const x = i * groupW + (groupW - barW * series.length) / 2 + j * barW;
                      return <rect key={s.key} x={x} y={y} width={barW - 1} height={h} fill={s.color} rx={2} />;
                    })}
                  </g>
                ))}
                <rect
                  x={0} y={0} width={c.innerW} height={c.innerH} fill="transparent"
                  onMouseMove={(e) => {
                    const r = (e.target as SVGRectElement).getBoundingClientRect();
                    const i = Math.floor(((e.clientX - r.left) / r.width) * data.length);
                    setHover(Math.max(0, Math.min(data.length - 1, i)));
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            </svg>
            {hover !== null && data[hover] && (
              <Tip
                x={PAD.l + hover * groupW + groupW / 2}
                y={PAD.t}
                label={xFormatter(data[hover][xKey])}
                items={series.map((s) => ({ c: s.color, n: s.name ?? s.key, v: c.yFormatter(Number(data[hover][s.key] ?? 0)) }))}
              />
            )}
          </>
        );
      }}
    </Container>
  );
}

/* ───────────────────────── StackedBarsMini ───────────────────────── */
export function StackedBarsMini(props: BaseProps) {
  const { data, xKey, series, height = 180, xFormatter = (v) => String(v) } = props;
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((s, sp) => s + Number(d[sp.key] ?? 0), 0));
  const yMax = Math.max(1, ...totals);
  return (
    <Container height={height}>
      {(width) => {
        const c = useChart({ ...props, width, yDomain: [0, yMax] as [number, number] });
        const groupW = c.innerW / Math.max(1, data.length);
        const barW = Math.max(2, groupW * 0.6);
        return (
          <>
            <svg width={width} height={height} className="block">
              <g transform={`translate(${PAD.l},${PAD.t})`}>
                {c.yTicks.map((t, i) => (
                  <g key={i}>
                    <line x1={0} x2={c.innerW} y1={c.yPos(t)} y2={c.yPos(t)} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                    <text x={-6} y={c.yPos(t) + 3} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{c.yFormatter(t)}</text>
                  </g>
                ))}
                {data.map((d, i) => {
                  let cursor = c.yPos(0);
                  return (
                    <g key={i}>
                      <text x={i * groupW + groupW / 2} y={c.innerH + 14} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                        {xFormatter(d[xKey])}
                      </text>
                      {series.map((s) => {
                        const v = Number(d[s.key] ?? 0);
                        const h = ((v) / yMax) * c.innerH;
                        cursor -= h;
                        return <rect key={s.key} x={i * groupW + (groupW - barW) / 2} y={cursor} width={barW} height={h} fill={s.color} />;
                      })}
                    </g>
                  );
                })}
                <rect
                  x={0} y={0} width={c.innerW} height={c.innerH} fill="transparent"
                  onMouseMove={(e) => {
                    const r = (e.target as SVGRectElement).getBoundingClientRect();
                    const i = Math.floor(((e.clientX - r.left) / r.width) * data.length);
                    setHover(Math.max(0, Math.min(data.length - 1, i)));
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            </svg>
            {hover !== null && data[hover] && (
              <Tip
                x={PAD.l + hover * groupW + groupW / 2}
                y={PAD.t}
                label={xFormatter(data[hover][xKey])}
                items={series.map((s) => ({ c: s.color, n: s.name ?? s.key, v: c.yFormatter(Number(data[hover][s.key] ?? 0)) }))}
              />
            )}
          </>
        );
      }}
    </Container>
  );
}

/* ───────────────────────── DonutMini ───────────────────────── */
interface DonutProps {
  data: { name: string; value: number; color: string }[];
  size?: number;
  inner?: number;
  className?: string;
}
export function DonutMini({ data, size = 160, inner = 50, className }: DonutProps) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const r = size / 2;
  let acc = -Math.PI / 2;
  const arcs = data.map((d) => {
    const angle = (d.value / total) * Math.PI * 2;
    const a0 = acc;
    const a1 = acc + angle;
    acc = a1;
    const large = angle > Math.PI ? 1 : 0;
    const x0 = r + Math.cos(a0) * r;
    const y0 = r + Math.sin(a0) * r;
    const x1 = r + Math.cos(a1) * r;
    const y1 = r + Math.sin(a1) * r;
    const ix0 = r + Math.cos(a1) * inner;
    const iy0 = r + Math.sin(a1) * inner;
    const ix1 = r + Math.cos(a0) * inner;
    const iy1 = r + Math.sin(a0) * inner;
    const path = [
      `M ${x0} ${y0}`,
      `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
      `L ${ix0} ${iy0}`,
      `A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");
    return { path, color: d.color, name: d.name, value: d.value };
  });
  return (
    <div className={"flex items-center justify-center " + (className ?? "")}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} />)}
      </svg>
    </div>
  );
}
