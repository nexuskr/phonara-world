import { useEffect, useRef } from "react";
import { createChart, AreaSeries, IChartApi, ISeriesApi, LineStyle } from "lightweight-charts";

interface Props {
  symbol: string;
  prices: Record<string, number>;
  height?: number;
}

export default function LivePriceChart({ symbol, prices, height = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const seedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255,255,255,0.6)",
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { style: LineStyle.Dashed }, horzLine: { style: LineStyle.Dashed } },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: "hsl(45 88% 55%)",
      topColor: "hsla(45,88%,55%,0.35)",
      bottomColor: "hsla(45,88%,55%,0)",
      lineWidth: 2,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => chart.applyOptions({ width: containerRef.current?.clientWidth ?? 0 });
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      seedTimeRef.current = 0;
    };
  }, [height]);

  // Seed historical klines on symbol change
  useEffect(() => {
    let cancelled = false;
    seedTimeRef.current = 0;
    if (seriesRef.current) seriesRef.current.setData([]);
    (async () => {
      try {
        const res = await fetch(
          `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=1&limit=200`,
        );
        const json = await res.json();
        const list: any[] = json?.result?.list ?? [];
        if (cancelled || !seriesRef.current || !list.length) return;
        const seen = new Set<number>();
        const data = list
          .map((row) => ({ time: Math.floor(parseInt(row[0], 10) / 1000), value: parseFloat(row[4]) }))
          .filter((d) => Number.isFinite(d.time) && Number.isFinite(d.value) && !seen.has(d.time) && (seen.add(d.time), true))
          .sort((a, b) => a.time - b.time);
        seriesRef.current.setData(data as any);
        seedTimeRef.current = data.length ? data[data.length - 1].time : 0;
        chartRef.current?.timeScale().fitContent();
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [symbol]);

  // Append live ticks (monotonic time guard)
  useEffect(() => {
    const price = prices[symbol];
    if (!price || !seriesRef.current) return;
    const t = Math.floor(Date.now() / 1000);
    if (t < seedTimeRef.current) return;
    seedTimeRef.current = t;
    try {
      seriesRef.current.update({ time: t as any, value: price });
    } catch {}
  }, [prices, symbol]);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-2">
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
