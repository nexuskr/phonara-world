import { useEffect, useState } from "react";
import { getFeed } from "@/lib/paper-trading/bybit-feed";

export type FeedStatus = "connecting" | "open" | "reconnecting" | "rest-fallback";

export function useBybitTicker() {
  const [prices, setPrices] = useState<Record<string, number>>(() => getFeed().getPrices());
  const [status, setStatus] = useState<FeedStatus>("connecting");

  useEffect(() => {
    const feed = getFeed();
    feed.start();
    const offP = feed.onPrices((p) => setPrices(p));
    const offS = feed.onStatus((s) => setStatus(s));
    setPrices(feed.getPrices());
    return () => { offP(); offS(); };
  }, []);

  return { prices, status };
}
