// V17 <PersonalizedFeedRail> — horizontal personalized feed.
// Loads recommendations from `rank_feed_for_user` RPC; if empty, asks the
// `feed-personalize` Edge function to build them, then re-loads.
import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { rankFeedForUser, type FeedRecommendation } from "@/lib/feed-rpc";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import FeedCard from "./FeedCard";

export default function PersonalizedFeedRail({ limit = 12 }: { limit?: number }) {
  const [items, setItems] = useState<FeedRecommendation[] | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try {
      const data = await rankFeedForUser(limit);
      setItems(data);
    } catch {
      setItems([]);
    }
  }

  async function generate() {
    setGenerating(true);
    try {
      await supabase.functions.invoke("feed-personalize", { body: {} });
      await load();
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (items == null) {
    return (
      <section className="space-y-3">
        <Header onRefresh={generate} busy={generating} />
        <LoadingList rows={1} />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <Header onRefresh={generate} busy={generating} />
        <EmptyState
          icon={<Sparkles className="w-5 h-5" />}
          title="아직 맞춤 피드가 없습니다"
          description="잠시 후 다시 확인하거나, 지금 새로고침으로 생성해보세요."
          variant="gold"
          size="sm"
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <Header onRefresh={generate} busy={generating} />
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {items.map((it) => (
          <div key={it.video_id} className="snap-start">
            <FeedCard videoId={it.video_id} viralScore={(it as any).score ?? null} />
          </div>
        ))}
      </div>
    </section>
  );
}

function Header({ onRefresh, busy }: { onRefresh: () => void; busy: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-display font-black tracking-wide">For You</h2>
        <span className="text-[10px] tracking-widest text-muted-foreground uppercase">개인화 피드</span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        aria-label="피드 새로고침"
        className="text-xs font-bold text-muted-foreground hover:text-primary transition flex items-center gap-1 disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> 새로고침
      </button>
    </div>
  );
}
