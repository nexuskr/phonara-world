import { useEffect, useRef } from "react";
import {
  createChart, CandlestickSeries, type IChartApi, type ISeriesApi,
  type Time, type IPriceLine, LineStyle, type CandlestickData, type UTCTimestamp,
} from "lightweight-charts";

interface OverlayLine { price: number; color: string; title: string }

const BUCKET_SEC = 60; // 1-minute candles

function bucket(ts: number) { return Math.floor(ts / BUCKET_SEC) * BUCKET_SEC; }

export default function LightweightChartPanel({
  symbol, price, overlays = [], height = 320,
}: {
  symbol: string;
  price: number;
  overlays?: OverlayLine[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<CandlestickData[]>([]);
  const linesRef = useRef<IPriceLine[]>([]);
  const lastSymbol = useRef(symbol);

  // Init chart
  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#cbd5e1",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      },
      grid: {
        vertLines: { color: "rgba(244,180,55,0.04)" },
        horzLines: { color: "rgba(244,180,55,0.04)" },
      },
      timeScale: { timeVisible: true, secondsVisible: false, borderVisible: false, rightOffset: 5 },
      rightPriceScale: { borderVisible: false },
      crosshair: { mode: 1 },
      width: ref.current.clientWidth,
      height,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#f43f5e",
      borderUpColor: "#34d399",
      borderDownColor: "#f43f5e",
      wickUpColor: "rgba(52,211,153,0.8)",
      wickDownColor: "rgba(244,63,94,0.8)",
      priceLineVisible: true,
      priceLineColor: "rgba(244,180,55,0.7)",
      priceLineStyle: LineStyle.Dotted,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (ref.current && chartRef.current) chartRef.current.applyOptions({ width: ref.current.clientWidth });
    });
    ro.observe(ref.current);

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, [height]);

  // Reset on symbol change
  useEffect(() => {
    if (lastSymbol.current !== symbol && seriesRef.current) {
      candlesRef.current = [];
      seriesRef.current.setData([]);
      lastSymbol.current = symbol;
    }
  }, [symbol]);

  // Tick → 1m candles
  useEffect(() => {
    if (!seriesRef.current || !price) return;
    const t = bucket(Math.floor(Date.now() / 1000)) as UTCTimestamp;
    const arr = candlesRef.current;
    const last = arr[arr.length - 1];
    if (!last || (last.time as number) < t) {
      const open = last ? last.close : price;
      const candle: CandlestickData = { time: t, open, high: Math.max(open, price), low: Math.min(open, price), close: price };
      arr.push(candle);
      // Cap history at 480 candles (8h)
      if (arr.length > 480) arr.shift();
      seriesRef.current.update(candle);
    } else {
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
      seriesRef.current.update(last);
    }
  }, [price]);

  // Overlay lines
  useEffect(() => {
    const s = seriesRef.current; if (!s) return;
    linesRef.current.forEach((l) => s.removePriceLine(l));
    linesRef.current = overlays.map((o) =>
      s.createPriceLine({
        price: o.price,
        color: o.color,
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: o.title,
      })
    );
  }, [overlays]);

  return (
    <div ref={ref} style={{ width: "100%", height }} />
  );
}
