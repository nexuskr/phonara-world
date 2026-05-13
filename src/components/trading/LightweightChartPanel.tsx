import { memo, useEffect, useRef } from "react";
import {
  createChart, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi,
  type IPriceLine, LineStyle, type CandlestickData, type LineData, type UTCTimestamp,
} from "lightweight-charts";
import { getFeed, fetchKlineHistory, type KlineBar, type KlineInterval } from "@/lib/paper-trading/bybit-feed";

interface OverlayLine { price: number; color: string; title: string }

interface Props {
  symbol: string;
  /** Tick price (from useSymbolPrice) — used as fallback when kline events are not yet flowing. */
  price: number;
  overlays?: OverlayLine[];
  height?: number;
  interval?: KlineInterval;
  /** Render mode — "candle" (default) or "line" (lighter, mobile-friendly). */
  mode?: "candle" | "line";
}

const INTERVAL_SECONDS: Record<KlineInterval, number> = {
  "1": 60, "3": 180, "5": 300, "15": 900, "30": 1800,
  "60": 3600, "240": 14400, "D": 86400, "W": 604800,
};

function bucket(ts: number, sec: number) { return Math.floor(ts / sec) * sec; }

function LightweightChartPanelImpl({ symbol, price, overlays = [], height = 320, interval = "1" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<CandlestickData[]>([]);
  const linesRef = useRef<IPriceLine[]>([]);
  const overlaysSigRef = useRef<string>("");
  const klineActiveRef = useRef(false);
  const lastDevLogRef = useRef(0);

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

  // Symbol/interval load: REST history + kline subscribe
  useEffect(() => {
    let cancelled = false;
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    klineActiveRef.current = false;
    candlesRef.current = [];
    series.setData([]);

    (async () => {
      const history = await fetchKlineHistory(symbol, interval, 1000);
      if (cancelled || !seriesRef.current) return;
      const data: CandlestickData[] = history.map((b) => ({
        time: b.time as UTCTimestamp,
        open: b.open, high: b.high, low: b.low, close: b.close,
      }));
      candlesRef.current = data;
      seriesRef.current.setData(data);
      try { chartRef.current?.timeScale().fitContent(); } catch {}
    })();

    const feed = getFeed();
    const off = feed.onKline(symbol, interval, (bar: KlineBar) => {
      if (cancelled || !seriesRef.current) return;
      klineActiveRef.current = true;
      const arr = candlesRef.current;
      const last = arr[arr.length - 1];
      const candle: CandlestickData = {
        time: bar.time as UTCTimestamp,
        open: bar.open, high: bar.high, low: bar.low, close: bar.close,
      };
      if (!last || (last.time as number) < bar.time) {
        arr.push(candle);
        if (arr.length > 800) arr.shift();
      } else if ((last.time as number) === bar.time) {
        last.open = bar.open; last.high = bar.high; last.low = bar.low; last.close = bar.close;
      }
      seriesRef.current.update(candle);
      try { chartRef.current?.timeScale().scrollToRealTime(); } catch {}

      if (import.meta.env.DEV) {
        const now = Date.now();
        if (now - lastDevLogRef.current >= 1000) {
          lastDevLogRef.current = now;
          // eslint-disable-next-line no-console
          console.debug("[KLINE]", interval, symbol, bar.close);
        }
      }
    });

    return () => { cancelled = true; off(); };
  }, [symbol, interval]);

  // Tick fallback: only used if kline events are NOT flowing yet.
  useEffect(() => {
    if (klineActiveRef.current) return;
    const series = seriesRef.current;
    if (!series || !price) return;
    const sec = INTERVAL_SECONDS[interval] ?? 60;
    const t = bucket(Math.floor(Date.now() / 1000), sec) as UTCTimestamp;
    const arr = candlesRef.current;
    const last = arr[arr.length - 1];
    if (!last || (last.time as number) < t) {
      const open = last ? last.close : price;
      const candle: CandlestickData = { time: t, open, high: Math.max(open, price), low: Math.min(open, price), close: price };
      arr.push(candle);
      if (arr.length > 800) arr.shift();
      series.update(candle);
    } else {
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
      series.update(last);
    }
  }, [price, interval]);

  useEffect(() => {
    const s = seriesRef.current; if (!s) return;
    const sig = overlays.map((o) => `${o.price.toFixed(6)}|${o.color}|${o.title}`).join(";");
    if (sig === overlaysSigRef.current) return;
    overlaysSigRef.current = sig;
    linesRef.current.forEach((l) => { try { s.removePriceLine(l); } catch {} });
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

  return <div ref={ref} style={{ width: "100%", height }} />;
}

const LightweightChartPanel = memo(LightweightChartPanelImpl);
export default LightweightChartPanel;
