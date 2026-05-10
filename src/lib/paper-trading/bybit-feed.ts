import { SYMBOLS } from "./types";
import { rafScheduler } from "@/lib/util/raf-scheduler";

export interface TickerStat {
  last: number;
  change24hPct: number; // -100..+inf, percent
  volume24h: number; // base volume
  turnover24h: number; // quote volume (USDT)
  high24h: number;
  low24h: number;
}

export interface KlineBar {
  time: number;     // seconds (UTCTimestamp)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  confirm: boolean;
}

type PriceListener = (priceMap: Record<string, number>) => void;
type StatsListener = (stats: Record<string, TickerStat>) => void;
type StatusListener = (s: "connecting" | "open" | "reconnecting" | "rest-fallback") => void;
type KlineListener = (bar: KlineBar) => void;
type Notify = () => void;

class BybitFeed {
  private ws: WebSocket | null = null;
  private prices: Record<string, number> = {};
  private stats: Record<string, TickerStat> = {};
  private klines: Record<string, KlineBar> = {};
  // Global listeners (used by useBybitTicker for full snapshots)
  private listeners = new Set<PriceListener>();
  private statsListeners = new Set<StatsListener>();
  private statusListeners = new Set<StatusListener>();
  // Per-symbol listeners (used by useSymbolPrice / useSymbolStat / chart kline)
  private symbolPriceListeners = new Map<string, Set<Notify>>();
  private symbolStatListeners = new Map<string, Set<Notify>>();
  private klineListeners = new Map<string, Set<KlineListener>>();
  private dirtyPriceSyms = new Set<string>();
  private dirtyStatSyms = new Set<string>();

  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private restTimer: number | null = null;
  private alive = true;
  private restMode = false;
  private started = false;
  private dirty = false;
  private emitScheduled = false;

  start() {
    if (this.started) return;
    this.started = true;
    this.alive = true;
    // Immediate REST warm-up so prices appear within ~1s even if WS is slow/blocked.
    this.fetchRestOnce();
    this.connect();
  }

  stop() {
    this.alive = false;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    if (this.restTimer) window.clearInterval(this.restTimer);
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }

  // ---- subscriptions ----
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
  onKline(sym: string, fn: KlineListener) {
    let set = this.klineListeners.get(sym);
    if (!set) { set = new Set(); this.klineListeners.set(sym, set); }
    set.add(fn);
    return () => { set!.delete(fn); };
  }

  getPrices() { return this.prices; }
  getStats() { return this.stats; }
  getKline(sym: string) { return this.klines[sym]; }

  // ---- emit (rAF coalesced) ----
  private emit() {
    this.dirty = true;
    if (this.emitScheduled) return;
    this.emitScheduled = true;
    rafScheduler.schedule(() => {
      this.emitScheduled = false;
      if (!this.dirty) return;
      this.dirty = false;

      // Fan out per-symbol notifies first (cheap, fine-grained selectors)
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

      // Then global snapshots (kept for back-compat with useBybitTicker)
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
    const prev = this.stats[sym] ?? { last: 0, change24hPct: 0, volume24h: 0, turnover24h: 0, high24h: 0, low24h: 0 };
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
        if (this.restTimer) { window.clearInterval(this.restTimer); this.restTimer = null; }
        // Subscribe both tickers AND 1-minute kline for every symbol.
        // Bybit allows up to 10 args per message — chunk to be safe.
        const args: string[] = [];
        for (const s of SYMBOLS) {
          args.push(`tickers.${s}`);
          args.push(`kline.1.${s}`);
        }
        for (let i = 0; i < args.length; i += 10) {
          const chunk = args.slice(i, i + 10);
          try { ws.send(JSON.stringify({ op: "subscribe", args: chunk })); } catch {}
        }
        this.pingTimer = window.setInterval(() => {
          try { ws.send(JSON.stringify({ op: "ping" })); } catch {}
        }, 20_000);
        this.status("open");
      };
      ws.onmessage = (ev) => {
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
              this.updateStat(sym, {
                last,
                ...(Number.isFinite(change) ? { change24hPct: change * 100 } : {}),
                ...(Number.isFinite(vol) ? { volume24h: vol } : {}),
                ...(Number.isFinite(turn) ? { turnover24h: turn } : {}),
                ...(Number.isFinite(hi) ? { high24h: hi } : {}),
                ...(Number.isFinite(lo) ? { low24h: lo } : {}),
              });
              this.emit();
            }
            return;
          }

          if (topic.startsWith("kline.")) {
            // topic format: kline.{interval}.{symbol}
            const parts = topic.split(".");
            const sym = parts[2];
            const arr = Array.isArray(msg.data) ? msg.data : [msg.data];
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
              this.klines[sym] = bar;
              // Also keep last price in sync from kline close (failsafe)
              this.prices[sym] = close;
              this.dirtyPriceSyms.add(sym);
              const set = this.klineListeners.get(sym);
              if (set) for (const fn of set) { try { fn(bar); } catch {} }
            }
            this.emit();
            return;
          }
        } catch {}
      };
      ws.onerror = () => { /* will close */ };
      ws.onclose = () => {
        window.clearTimeout(watchdog);
        if (this.pingTimer) { window.clearInterval(this.pingTimer); this.pingTimer = null; }
        if (!this.alive) return;
        this.status("reconnecting");
        this.startRestFallback();
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3_000);
      };
    } catch {
      window.clearTimeout(watchdog);
      this.startRestFallback();
      this.reconnectTimer = window.setTimeout(() => this.connect(), 5_000);
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
          this.updateStat(r.symbol, {
            ...(Number.isFinite(last) && last > 0 ? { last } : {}),
            ...(Number.isFinite(change) ? { change24hPct: change * 100 } : {}),
            ...(Number.isFinite(vol) ? { volume24h: vol } : {}),
            ...(Number.isFinite(turn) ? { turnover24h: turn } : {}),
            ...(Number.isFinite(hi) ? { high24h: hi } : {}),
            ...(Number.isFinite(lo) ? { low24h: lo } : {}),
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

/** REST fetch for historical klines — used by chart on mount/symbol change. */
export async function fetchKlineHistory(
  symbol: string,
  interval: "1" | "3" | "5" | "15" | "60" = "1",
  limit = 300,
): Promise<KlineBar[]> {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const list: any[] = json?.result?.list ?? [];
    // Bybit returns newest-first; chart needs oldest-first ascending.
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
