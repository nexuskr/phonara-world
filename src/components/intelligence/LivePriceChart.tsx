import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, LineStyle } from "lightweight-charts";

interface Props {
  symbol: string;
  prices: Record<string, number>;
  height?: number;
}

export default function LivePriceChart({ symbol, prices, height = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const lastBarRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);

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
    const series = chart.addAreaSeries({
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
      lastBarRef.current = null;
    };
  }, [height]);

  // Reset chart on symbol change
  useEffect(() => {
    if (seriesRef.current) seriesRef.current.setData([]);
    lastBarRef.current = null;
  }, [symbol]);

  // Append price ticks
  useEffect(() => {
    const price = prices[symbol];
    if (!price || !seriesRef.current) return;
    const t = Math.floor(Date.now() / 1000);
    seriesRef.current.update({ time: t as any, value: price });
  }, [prices, symbol]);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-2">
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
