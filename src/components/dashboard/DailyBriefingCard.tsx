// Week 2 — Daily AI Briefing Card (5 cards) for Dashboard top
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Sparkles, RefreshCw } from "lucide-react";
import { LoadingList } from "@/components/ui/loading-state";

type Card = { kind: string; emoji?: string; title: string; body: string; cta?: string };
type Briefing = { briefing_date: string; cards: Card[]; model: string | null; generated_at: string; refreshed_count: number };

export default function DailyBriefingCard() {
  const [b, setB] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data } = await supabase.rpc("get_my_daily_briefing");
    const row = (data?.[0] as Briefing) ?? null;
    setB(row);
    setLoading(false);
    return row;
  };

  const generate = async () => {
    setRefreshing(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { notify.error("로그인이 필요합니다"); return; }
      const r = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emperor-coach`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: "{}",
        }
      );
      if (r.status === 429) {
        notify.error("잠시 후 다시 시도", { description: "1시간에 3회까지 새로고침 가능" });
      } else if (!r.ok) {
        const t = await r.text();
        notify.error("브리핑 생성 실패", { description: t.slice(0, 120) });
      } else {
        await load();
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const row = await load();
      if (!mounted) return;
      if (!row) await generate();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => (b?.cards ?? []).filter((c) => c?.title && c?.body).slice(0, 5), [b]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card/40 p-4">
        <LoadingList rows={2} />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-4 backdrop-blur-sm">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-bold text-sm">오늘의 황실 브리핑</h2>
          {b?.model && <span className="hidden sm:inline text-[10px] text-muted-foreground">· {b.model}</span>}
        </div>
        <button
          onClick={generate}
          disabled={refreshing}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/60 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </header>

      {cards.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          오늘의 브리핑을 준비하지 못했습니다. 새로고침을 눌러주세요.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {cards.map((c, i) => (
            <motion.div
              key={`${c.kind}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-background/60 border border-border/60 p-3 flex flex-col gap-1.5 hover:border-primary/50 transition"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
                <span className="text-base leading-none">{c.emoji ?? "•"}</span>
                <span>{c.kind}</span>
              </div>
              <div className="font-semibold text-sm leading-tight">{c.title}</div>
              <div className="text-xs text-muted-foreground leading-snug flex-1">{c.body}</div>
              {c.cta && (
                <div className="text-xs font-semibold text-primary mt-1">{c.cta}</div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
