import { SYMBOLS } from "./types";
import { rafScheduler } from "@/lib/util/raf-scheduler";

export interface TickerStat {
  last: number;
  change24hPct: number;
  volume24h: number;
  turnover24h: number;
  high24h: number;
  low24h: number;
  fundingRate: number;        // e.g. 0.0001 = 0.01%
  nextFundingTime: number;    // ms epoch
}

export interface KlineBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  confirm: boolean;
}

export type KlineInterval = "1" | "3" | "5" | "15" | "30" | "60" | "240" | "D" | "W";
export const DEFAULT_INTERVAL: KlineInterval = "1";

type PriceListener = (priceMap: Record<string, number>) => void;
type StatsListener = (stats: Record<string, TickerStat>) => void;
type StatusListener = (s: "connecting" | "open" | "reconnecting" | "rest-fallback") => void;
type KlineListener = (bar: KlineBar) => void;
type Notify = () => void;

const klineKey = (sym: string, interval: KlineInterval) => `${interval}:${sym}`;

class BybitFeed {
  private ws: WebSocket | null = null;
  private prices: Record<string, number> = {};
  private stats: Record<string, TickerStat> = {};
  private klines: Record<string, KlineBar> = {};
  private listeners = new Set<PriceListener>();
  private statsListeners = new Set<StatsListener>();
  private statusListeners = new Set<StatusListener>();
  private symbolPriceListeners = new Map<string, Set<Notify>>();
  private symbolStatListeners = new Map<string, Set<Notify>>();
  // key = `${interval}:${symbol}`
  private klineListeners = new Map<string, Set<KlineListener>>();
  // active interval-symbol subscriptions tracked for re-subscribe on reconnect
  private activeKlineTopics = new Set<string>(); // topic strings like kline.1.BTCUSDT
  private dirtyPriceSyms = new Set<string>();
  private dirtyStatSyms = new Set<string>();

  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private pongWatchdog: number | null = null;
  private restTimer: number | null = null;
  private alive = true;
  private restMode = false;
  private started = false;
  private dirty = false;
  private emitScheduled = false;
  private reconnectAttempt = 0;
  private lastMessageAt = 0;
  private visibilityBound = false;

  start() {
    if (this.started) return;
    this.started = true;
    this.alive = true;
    this.bindVisibility();
    this.fetchRestOnce();
    this.connect();
  }

  stop() {
    this.alive = false;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    if (this.pongWatchdog) window.clearInterval(this.pongWatchdog);
    if (this.restTimer) window.clearInterval(this.restTimer);
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }

  private bindVisibility() {
    if (this.visibilityBound || typeof document === "undefined") return;
    this.visibilityBound = true;
    const kick = () => {
      if (!this.alive) return;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        if (this.reconnectTimer) { window.clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        this.reconnectAttempt = 0;
        this.connect();
      }
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") kick();
    });
    window.addEventListener("online", kick);
  }

  onPrices(fn: PriceListener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onStats(fn: StatsListener) { this.statsListeners.add(fn); return () => this.statsListeners.delete(fn); }
  onStatus(fn: StatusListener) { this.statusListeners.add(fn); return () => this.statusListeners.delete(fn); }

  onSymbolPrice(sym: string, fn: Notify) {
    let set = this.symbolPriceListeners.get(sym);
    if (!set) { set = new Set(); this.symbolPriceListeners.set(sym, set); }
    set.add(fn);
    return () => { set!.delete(fn); };
  }
  onSymbolStat(sym: string, fn: Notify) {
    let set = this.symbolStatListeners.get(sym);
    if (!set) { set = new Set(); this.symbolStatListeners.set(sym, set); }
    set.add(fn);
    return () => { set!.delete(fn); };
  }

  /** Subscribe to a kline interval for a symbol. Reference-counted: subscribes WS topic on first listener,
   *  unsubscribes on last. Default 1m is already subscribed for all symbols at WS open. */
  onKline(sym: string, interval: KlineInterval, fn: KlineListener) {
    const key = klineKey(sym, interval);
    let set = this.klineListeners.get(key);
    const firstForKey = !set || set.size === 0;
    if (!set) { set = new Set(); this.klineListeners.set(key, set); }
    set.add(fn);

    const topic = `kline.${interval}.${sym}`;
    if (firstForKey && interval !== DEFAULT_INTERVAL && !this.activeKlineTopics.has(topic)) {
      this.activeKlineTopics.add(topic);
      this.sendSub([topic]);
    }
    return () => {
      set!.delete(fn);
      if (set!.size === 0 && interval !== DEFAULT_INTERVAL) {
        this.klineListeners.delete(key);
        this.activeKlineTopics.delete(topic);
        this.sendUnsub([topic]);
      }
    };
  }

  getPrices() { return this.prices; }
  getStats() { return this.stats; }
  getKline(sym: string) { return this.klines[sym]; }

  private sendSub(args: string[]) {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || args.length === 0) return;
    for (let i = 0; i < args.length; i += 10) {
      const chunk = args.slice(i, i + 10);
      try { ws.send(JSON.stringify({ op: "subscribe", args: chunk })); } catch {}
    }
  }
  private sendUnsub(args: string[]) {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || args.length === 0) return;
    for (let i = 0; i < args.length; i += 10) {
      const chunk = args.slice(i, i + 10);
      try { ws.send(JSON.stringify({ op: "unsubscribe", args: chunk })); } catch {}
    }
  }

  private emit() {
    this.dirty = true;
    if (this.emitScheduled) return;
    this.emitScheduled = true;
    rafScheduler.schedule(() => {
      this.emitScheduled = false;
      if (!this.dirty) return;
      this.dirty = false;
      for (const sym of this.dirtyPriceSyms) {
        const set = this.symbolPriceListeners.get(sym);
        if (set) for (const fn of set) fn();
      }
      for (const sym of this.dirtyStatSyms) {
        const set = this.symbolStatListeners.get(sym);
        if (set) for (const fn of set) fn();
      }
      this.dirtyPriceSyms.clear();
      this.dirtyStatSyms.clear();
      if (this.listeners.size > 0) {
        const psnap = { ...this.prices };
        for (const fn of this.listeners) fn(psnap);
      }
      if (this.statsListeners.size > 0) {
        const ssnap = { ...this.stats };
        for (const fn of this.statsListeners) fn(ssnap);
      }
    });
  }

  private status(s: Parameters<StatusListener>[0]) { for (const fn of this.statusListeners) fn(s); }

  private updateStat(sym: string, partial: Partial<TickerStat>) {
    const prev = this.stats[sym] ?? {
      last: 0, change24hPct: 0, volume24h: 0, turnover24h: 0,
      high24h: 0, low24h: 0, fundingRate: 0, nextFundingTime: 0,
    };
    this.stats[sym] = { ...prev, ...partial };
    this.dirtyStatSyms.add(sym);
  }

  private connect() {
    if (!this.alive) return;
    this.status("connecting");
    const watchdog = window.setTimeout(() => {
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) this.startRestFallback();
    }, 4_000);
    try {
      const ws = new WebSocket("wss://stream.bybit.com/v5/public/linear");
      this.ws = ws;
      ws.onopen = () => {
        window.clearTimeout(watchdog);
        this.restMode = false;
        this.reconnectAttempt = 0;
        this.lastMessageAt = Date.now();
        if (this.restTimer) { window.clearInterval(this.restTimer); this.restTimer = null; }
        // Default subscriptions: tickers + 1m kline for all symbols.
        const args: string[] = [];
        const seen = new Set<string>();
        for (const s of SYMBOLS) {
          const t1 = `tickers.${s}`;
          const t2 = `kline.${DEFAULT_INTERVAL}.${s}`;
          if (!seen.has(t1)) { seen.add(t1); args.push(t1); }
          if (!seen.has(t2)) { seen.add(t2); args.push(t2); }
        }
        // Re-subscribe any active non-default kline topics (e.g. if user had switched timeframe before reconnect).
        for (const t of this.activeKlineTopics) {
          if (!seen.has(t)) { seen.add(t); args.push(t); }
        }
        this.sendSub(args);

        this.pingTimer = window.setInterval(() => {
          try { ws.send(JSON.stringify({ op: "ping" })); } catch {}
        }, 20_000);
        // Pong watchdog: if no incoming message for 30s, force reconnect.
        this.pongWatchdog = window.setInterval(() => {
          if (this.lastMessageAt && Date.now() - this.lastMessageAt > 30_000) {
            try { ws.close(); } catch {}
          }
        }, 5_000);
        this.status("open");
      };
      ws.onmessage = (ev) => {
        this.lastMessageAt = Date.now();
        try {
          const msg = JSON.parse(ev.data);
          const topic: string | undefined = msg.topic;
          if (!topic || !msg.data) return;

          if (topic.startsWith("tickers.")) {
            const d = msg.data;
            const sym = d.symbol;
            const last = parseFloat(d.lastPrice ?? d.markPrice);
            if (sym && Number.isFinite(last) && last > 0) {
              this.prices[sym] = last;
              this.dirtyPriceSyms.add(sym);
              const change = parseFloat(d.price24hPcnt);
              const vol = parseFloat(d.volume24h);
              const turn = parseFloat(d.turnover24h);
              const hi = parseFloat(d.highPrice24h);
              const lo = parseFloat(d.lowPrice24h);
              const fr = parseFloat(d.fundingRate);
              const nft = parseFloat(d.nextFundingTime);
              this.updateStat(sym, {
                last,
                ...(Number.isFinite(change) ? { change24hPct: change * 100 } : {}),
                ...(Number.isFinite(vol) ? { volume24h: vol } : {}),
                ...(Number.isFinite(turn) ? { turnover24h: turn } : {}),
                ...(Number.isFinite(hi) ? { high24h: hi } : {}),
                ...(Number.isFinite(lo) ? { low24h: lo } : {}),
                ...(Number.isFinite(fr) ? { fundingRate: fr } : {}),
                ...(Number.isFinite(nft) ? { nextFundingTime: nft } : {}),
              });
              this.emit();
            }
            return;
          }

          if (topic.startsWith("kline.")) {
            // kline.{interval}.{symbol}
            const parts = topic.split(".");
            const interval = parts[1] as KlineInterval;
            const sym = parts[2];
            const arr = Array.isArray(msg.data) ? msg.data : [msg.data];
            const key = klineKey(sym, interval);
            const set = this.klineListeners.get(key);
            for (const k of arr) {
              const time = Math.floor(Number(k.start) / 1000);
              const open = Number(k.open);
              const high = Number(k.high);
              const low = Number(k.low);
              const close = Number(k.close);
              const volume = Number(k.volume);
              const confirm = !!k.confirm;
              if (!Number.isFinite(time) || !Number.isFinite(close) || close <= 0) continue;
              const bar: KlineBar = { time, open, high, low, close, volume, confirm };
              if (interval === DEFAULT_INTERVAL) {
                this.klines[sym] = bar;
                this.prices[sym] = close;
                this.dirtyPriceSyms.add(sym);
              }
              if (set) for (const fn of set) { try { fn(bar); } catch {} }
            }
            this.emit();
            return;
          }
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => {
        window.clearTimeout(watchdog);
        if (this.pingTimer) { window.clearInterval(this.pingTimer); this.pingTimer = null; }
        if (this.pongWatchdog) { window.clearInterval(this.pongWatchdog); this.pongWatchdog = null; }
        if (!this.alive) return;
        this.status("reconnecting");
        this.startRestFallback();
        // Exponential backoff: 1s, 2s, 4s, 8s, 15s cap.
        const delays = [1_000, 2_000, 4_000, 8_000, 15_000];
        const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];
        this.reconnectAttempt++;
        this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
      };
    } catch {
      window.clearTimeout(watchdog);
      this.startRestFallback();
      const delays = [1_000, 2_000, 4_000, 8_000, 15_000];
      const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];
      this.reconnectAttempt++;
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
    }
  }

  private async fetchRestOnce() {
    try {
      const res = await fetch("https://api.bybit.com/v5/market/tickers?category=linear");
      const json = await res.json();
      const list = json?.result?.list ?? [];
      const wl = new Set<string>(SYMBOLS);
      for (const r of list) {
        if (wl.has(r.symbol)) {
          const last = parseFloat(r.lastPrice);
          if (Number.isFinite(last) && last > 0) {
            this.prices[r.symbol] = last;
            this.dirtyPriceSyms.add(r.symbol);
          }
          const change = parseFloat(r.price24hPcnt);
          const vol = parseFloat(r.volume24h);
          const turn = parseFloat(r.turnover24h);
          const hi = parseFloat(r.highPrice24h);
          const lo = parseFloat(r.lowPrice24h);
          const fr = parseFloat(r.fundingRate);
          const nft = parseFloat(r.nextFundingTime);
          this.updateStat(r.symbol, {
            ...(Number.isFinite(last) && last > 0 ? { last } : {}),
            ...(Number.isFinite(change) ? { change24hPct: change * 100 } : {}),
            ...(Number.isFinite(vol) ? { volume24h: vol } : {}),
            ...(Number.isFinite(turn) ? { turnover24h: turn } : {}),
            ...(Number.isFinite(hi) ? { high24h: hi } : {}),
            ...(Number.isFinite(lo) ? { low24h: lo } : {}),
            ...(Number.isFinite(fr) ? { fundingRate: fr } : {}),
            ...(Number.isFinite(nft) ? { nextFundingTime: nft } : {}),
          });
        }
      }
      this.emit();
    } catch {}
  }

  private startRestFallback() {
    if (this.restMode) return;
    this.restMode = true;
    this.status("rest-fallback");
    this.fetchRestOnce();
    this.restTimer = window.setInterval(() => this.fetchRestOnce(), 5_000);
  }
}

let _feed: BybitFeed | null = null;
export function getFeed(): BybitFeed {
  if (!_feed) _feed = new BybitFeed();
  return _feed;
}

export async function fetchKlineHistory(
  symbol: string,
  interval: KlineInterval = "1",
  limit = 1000,
): Promise<KlineBar[]> {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const list: any[] = json?.result?.list ?? [];
    const out: KlineBar[] = list.map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
      confirm: true,
    })).filter((b) => Number.isFinite(b.time) && Number.isFinite(b.close) && b.close > 0);
    out.sort((a, b) => a.time - b.time);
    return out;
  } catch {
    return [];
  }
}
