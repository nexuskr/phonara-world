// V17 <FeedCard> — a single feed item with 3-second autoplay + dwell tracking.
// Purely presentational placeholder (real video playback wires in Phase U).
// Records feed_events via SECURITY DEFINER RPC at meaningful milestones.
import { useEffect, useRef, useState } from "react";
import { Play, Heart, Share2 } from "lucide-react";
import { recordFeedEvent } from "@/lib/feed-rpc";
import { Button } from "@/components/ui/button";
import ViralScoreBadge from "@/components/feed/ViralScoreBadge";

export interface FeedCardProps {
  videoId: string;
  title?: string;
  thumbnail?: string;
  region?: string;
  viralScore?: number | null;
}

export default function FeedCard({ videoId, title, thumbnail, region, viralScore }: FeedCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const enteredAt = useRef<number | null>(null);
  const firedView = useRef(false);
  const fired3s = useRef(false);
  const [liked, setLiked] = useState(false);

  // Track in-viewport dwell for view + 3s milestones
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!enteredAt.current) enteredAt.current = Date.now();
            if (!firedView.current) {
              firedView.current = true;
              void recordFeedEvent(videoId, "view", 0, region).catch(() => undefined);
            }
            // schedule 3s milestone
            window.setTimeout(() => {
              if (!fired3s.current && enteredAt.current) {
                fired3s.current = true;
                void recordFeedEvent(videoId, "3s", 3000, region).catch(() => undefined);
              }
            }, 3000);
          } else if (enteredAt.current) {
            const dwell = Date.now() - enteredAt.current;
            enteredAt.current = null;
            if (dwell >= 8000) {
              void recordFeedEvent(videoId, "complete", dwell, region).catch(() => undefined);
            }
          }
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [videoId, region]);

  return (
    <article
      ref={ref}
      className="glass-strong border border-border/50 rounded-2xl overflow-hidden flex flex-col w-[260px] flex-shrink-0 hover:border-primary/60 transition"
    >
      <div className="relative aspect-[9/16] bg-gradient-to-br from-muted/40 to-background flex items-center justify-center">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title ?? videoId}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <Play className="w-10 h-10 text-primary/70" aria-hidden />
        )}
        <span className="absolute top-2 left-2 text-[9px] font-bold tracking-widest uppercase bg-background/70 text-foreground px-1.5 py-0.5 rounded">
          {region ?? "GLOBAL"}
        </span>
        {typeof viralScore === "number" && (
          <span className="absolute top-2 right-2">
            <ViralScoreBadge score={viralScore} />
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="text-xs font-bold line-clamp-2 min-h-[2rem]">
          {title ?? `Video ${videoId.slice(0, 8)}`}
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            aria-label="좋아요"
            onClick={() => {
              setLiked((v) => !v);
              if (!liked) void recordFeedEvent(videoId, "like", 0, region).catch(() => undefined);
            }}
          >
            <Heart
              className={`w-3.5 h-3.5 ${liked ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            aria-label="공유"
            onClick={async () => {
              await recordFeedEvent(videoId, "share", 0, region).catch(() => undefined);
              try {
                await navigator.share?.({ title: title ?? "Phonara", url: `${location.origin}/c/${videoId}` });
              } catch { /* user cancel */ }
            }}
          >
            <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </article>
  );
}
