import { SYMBOLS } from "./types";

export interface TickerStat {
  last: number;
  change24hPct: number; // -100..+inf, percent
  volume24h: number; // base volume
  turnover24h: number; // quote volume (USDT)
  high24h: number;
  low24h: number;
}

type PriceListener = (priceMap: Record<string, number>) => void;
type StatsListener = (stats: Record<string, TickerStat>) => void;
type StatusListener = (s: "connecting" | "open" | "reconnecting" | "rest-fallback") => void;

class BybitFeed {
  private ws: WebSocket | null = null;
  private prices: Record<string, number> = {};
  private stats: Record<string, TickerStat> = {};
  private listeners = new Set<PriceListener>();
  private statsListeners = new Set<StatsListener>();
  private statusListeners = new Set<StatusListener>();
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private restTimer: number | null = null;
  private alive = true;
  private restMode = false;
  private started = false;
  private emitTimer: number | null = null;
  private dirty = false;

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

  onPrices(fn: PriceListener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onStats(fn: StatsListener) { this.statsListeners.add(fn); return () => this.statsListeners.delete(fn); }
  onStatus(fn: StatusListener) { this.statusListeners.add(fn); return () => this.statusListeners.delete(fn); }
  getPrices() { return { ...this.prices }; }
  getStats() { return { ...this.stats }; }

  private emit() {
    this.dirty = true;
    if (this.emitTimer != null) return;
    this.emitTimer = window.setTimeout(() => {
      this.emitTimer = null;
      if (!this.dirty) return;
      this.dirty = false;
      const psnap = { ...this.prices };
      const ssnap = { ...this.stats };
      for (const fn of this.listeners) fn(psnap);
      for (const fn of this.statsListeners) fn(ssnap);
    }, 120);
  }
  private status(s: Parameters<StatusListener>[0]) { for (const fn of this.statusListeners) fn(s); }

  private updateStat(sym: string, partial: Partial<TickerStat>) {
    const prev = this.stats[sym] ?? { last: 0, change24hPct: 0, volume24h: 0, turnover24h: 0, high24h: 0, low24h: 0 };
    this.stats[sym] = { ...prev, ...partial };
  }

  private connect() {
    if (!this.alive) return;
    this.status("connecting");
    // Watchdog: if WS doesn't open within 4s, kick REST polling.
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
        ws.send(JSON.stringify({
          op: "subscribe",
          args: SYMBOLS.map((s) => `tickers.${s}`),
        }));
        this.pingTimer = window.setInterval(() => {
          try { ws.send(JSON.stringify({ op: "ping" })); } catch {}
        }, 20_000);
        this.status("open");
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.topic && msg.topic.startsWith("tickers.") && msg.data) {
            const d = msg.data;
            const sym = d.symbol;
            const last = parseFloat(d.lastPrice ?? d.markPrice);
            if (sym && Number.isFinite(last) && last > 0) {
              this.prices[sym] = last;
              this.emit();
            }
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
          if (Number.isFinite(last) && last > 0) this.prices[r.symbol] = last;
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
