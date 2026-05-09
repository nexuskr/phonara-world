import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Search, Trophy } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { usePaperStore } from "@/lib/paper-trading/store";
import { computePnl } from "@/lib/paper-trading/engine";
import { useBybitTicker } from "@/hooks/use-bybit-ticker";
import { toCSV, downloadCSV } from "@/lib/csv";
import { track } from "@/lib/telemetry";
import type { Position } from "@/lib/paper-trading/types";

type TabKey = "open" | "closed" | "all";
type Period = "today" | "week" | "month" | "all";
type WL = "all" | "win" | "loss";

const PERIOD_MS: Record<Period, number> = {
  today: 24 * 3600_000,
  week: 7 * 24 * 3600_000,
  month: 30 * 24 * 3600_000,
  all: Number.POSITIVE_INFINITY,
};

export default function TradingHistoryPanel() {
  const { prices } = useBybitTicker();
  const positions = usePaperStore((s) => s.positions);
  const history = usePaperStore((s) => s.history);

  const [tab, setTab] = useState<TabKey>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [wl, setWl] = useState<WL>("all");
  const [side, setSide] = useState<"all" | "long" | "short">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list: Array<Position & { _live?: number }> = [];
    if (tab === "open" || tab === "all") {
      for (const p of positions) list.push({ ...p, _live: prices[p.symbol] ?? p.entry });
    }
    if (tab === "closed" || tab === "all") {
      for (const p of history) list.push(p);
    }
    const now = Date.now();
    return list
      .filter((p) => {
        if (period !== "all") {
          const ts = p.closed?.at ?? p.openedAt;
          if (now - ts > PERIOD_MS[period]) return false;
        }
        if (side !== "all" && p.side !== side) return false;
        if (wl !== "all") {
          const pnl = p.closed?.pnl ?? computePnl(p, p._live ?? p.entry);
          if (wl === "win" && pnl <= 0) return false;
          if (wl === "loss" && pnl > 0) return false;
        }
        if (q && !p.symbol.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (b.closed?.at ?? b.openedAt) - (a.closed?.at ?? a.openedAt));
  }, [tab, period, side, wl, q, positions, history, prices]);

  const closedOnly = rows.filter((r) => r.closed);
  const totalPnl = closedOnly.reduce((s, r) => s + (r.closed?.pnl ?? 0), 0);
  const wins = closedOnly.filter((r) => (r.closed?.pnl ?? 0) > 0).length;
  const winRate = closedOnly.length ? (wins / closedOnly.length) * 100 : 0;
  const best = closedOnly.reduce<Position | null>((b, r) =>
    !b || (r.closed?.pnl ?? 0) > (b.closed?.pnl ?? 0) ? r : b, null);
  const avgRoi = closedOnly.length
    ? (closedOnly.reduce((s, r) => s + (r.closed?.roi ?? 0), 0) / closedOnly.length) * 100
    : 0;

  const exportCsv = () => {
    const csv = toCSV(
      rows.map((r) => {
        const live = r._live ?? r.closed?.price ?? r.entry;
        const pnl = r.closed?.pnl ?? computePnl(r, live);
        const roi = r.closed?.roi ? r.closed.roi * 100 : (pnl / r.margin) * 100;
        return {
          openedAt: format(r.openedAt, "yyyy-MM-dd HH:mm"),
          closedAt: r.closed ? format(r.closed.at, "yyyy-MM-dd HH:mm") : "open",
          symbol: r.symbol,
          side: r.side,
          leverage: r.leverage,
          margin: r.margin,
          entry: r.entry.toFixed(4),
          exit: r.closed ? r.closed.price.toFixed(4) : live.toFixed(4),
          pnl: pnl.toFixed(2),
          roi: roi.toFixed(2) + "%",
          status: r.closed ? r.closed.reason : "open",
        };
      }),
      [
        { key: "openedAt", label: "Opened" },
        { key: "closedAt", label: "Closed" },
        { key: "symbol", label: "Symbol" },
        { key: "side", label: "Side" },
        { key: "leverage", label: "Lev" },
        { key: "margin", label: "Margin" },
        { key: "entry", label: "Entry" },
        { key: "exit", label: "Exit/Live" },
        { key: "pnl", label: "PnL (Paper USDT)" },
        { key: "roi", label: "ROI" },
        { key: "status", label: "Status" },
      ],
    );
    downloadCSV(`phonara-trades-${format(Date.now(), "yyyyMMdd-HHmm")}.csv`, csv);
    track("cta_click", { surface: "trading_csv_export" });
  };

  return (
    <section className="glass-strong rounded-3xl border border-primary/20 p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          My Trading History
        </h2>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="Win Rate" value={`${winRate.toFixed(1)}%`} />
        <Stat label="Total PnL" value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`} positive={totalPnl >= 0} />
        <Stat label="Best Trade" value={best?.closed ? `+${best.closed.pnl.toFixed(2)}` : "—"} positive />
        <Stat label="Avg ROI" value={`${avgRoi.toFixed(1)}%`} positive={avgRoi >= 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-28 h-9 bg-background/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">7 days</SelectItem>
            <SelectItem value="month">30 days</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={wl} onValueChange={(v) => setWl(v as WL)}>
          <SelectTrigger className="w-24 h-9 bg-background/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">W/L</SelectItem>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
          </SelectContent>
        </Select>
        <Select value={side} onValueChange={(v) => setSide(v as any)}>
          <SelectTrigger className="w-24 h-9 bg-background/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Side</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Symbol…" className="pl-7 h-9 bg-background/60" />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState size="sm" variant="muted" title="기록이 없습니다" description="첫 트레이드 후 여기에 자동으로 기록됩니다." />
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="px-2 py-2 font-medium">Time</th>
                <th className="px-2 py-2 font-medium">Symbol</th>
                <th className="px-2 py-2 font-medium">Side</th>
                <th className="px-2 py-2 font-medium">Lev</th>
                <th className="px-2 py-2 font-medium">Entry</th>
                <th className="px-2 py-2 font-medium">Exit</th>
                <th className="px-2 py-2 font-medium text-right">PnL (Paper)</th>
                <th className="px-2 py-2 font-medium text-right">ROI</th>
                <th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const live = r._live ?? r.closed?.price ?? r.entry;
                const pnl = r.closed?.pnl ?? computePnl(r, live);
                const roi = r.closed?.roi ? r.closed.roi * 100 : (pnl / r.margin) * 100;
                const positive = pnl >= 0;
                const big = pnl >= 100;
                const huge = pnl >= 500;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-border/30 ${huge ? "bg-primary/20 ring-1 ring-primary/40" : big ? "bg-primary/10" : ""}`}
                  >
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                      {format(r.closed?.at ?? r.openedAt, "MM/dd HH:mm")}
                    </td>
                    <td className="px-2 py-2 font-bold">{r.symbol}</td>
                    <td className={`px-2 py-2 ${r.side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
                      {r.side.toUpperCase()}
                    </td>
                    <td className="px-2 py-2">{r.leverage}×</td>
                    <td className="px-2 py-2 font-mono tabular-nums">{r.entry.toFixed(2)}</td>
                    <td className="px-2 py-2 font-mono tabular-nums">{(r.closed?.price ?? live).toFixed(2)}</td>
                    <td className={`px-2 py-2 text-right font-mono tabular-nums font-bold ${positive ? (huge ? "text-primary drop-shadow-[0_0_10px_hsl(45_88%_55%/0.6)]" : "text-emerald-400") : "text-rose-400"} ${big ? "text-base" : ""}`}>
                      {positive ? "+" : ""}{pnl.toFixed(2)}
                      {huge ? " 👑" : big ? " 🔥" : ""}
                    </td>
                    <td className={`px-2 py-2 text-right font-mono tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                      {roi.toFixed(1)}%
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {r.closed ? r.closed.reason : "open"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/80">
        모든 PnL은 Paper Trading 시뮬레이션 결과이며 실제 잔액에 영향을 주지 않습니다.
      </p>
    </section>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="text-[10px] text-muted-foreground tracking-wider">{label}</div>
      <div className={`mt-1 font-display font-black text-lg tabular-nums ${
        positive === undefined ? "" : positive ? "text-emerald-400" : "text-rose-400"
      }`}>
        {value}
      </div>
    </div>
  );
}
