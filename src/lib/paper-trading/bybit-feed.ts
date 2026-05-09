import { SYMBOLS } from "./types";

type PriceListener = (priceMap: Record<string, number>) => void;
type StatusListener = (s: "connecting" | "open" | "reconnecting" | "rest-fallback") => void;

class BybitFeed {
  private ws: WebSocket | null = null;
  private prices: Record<string, number> = {};
  private listeners = new Set<PriceListener>();
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
  onStatus(fn: StatusListener) { this.statusListeners.add(fn); return () => this.statusListeners.delete(fn); }
  getPrices() { return { ...this.prices }; }

  private emit() {
    this.dirty = true;
    if (this.emitTimer != null) return;
    this.emitTimer = window.setTimeout(() => {
      this.emitTimer = null;
      if (!this.dirty) return;
      this.dirty = false;
      const snap = { ...this.prices };
      for (const fn of this.listeners) fn(snap);
    }, 120);
  }
  private status(s: Parameters<StatusListener>[0]) { for (const fn of this.statusListeners) fn(s); }

  private connect() {
    if (!this.alive) return;
    this.status("connecting");
    try {
      const ws = new WebSocket("wss://stream.bybit.com/v5/public/linear");
      this.ws = ws;
      ws.onopen = () => {
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
        if (this.pingTimer) { window.clearInterval(this.pingTimer); this.pingTimer = null; }
        if (!this.alive) return;
        this.status("reconnecting");
        this.startRestFallback();
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3_000);
      };
    } catch {
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
