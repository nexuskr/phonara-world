import { memo } from "react";
import type { LiveFeedItem } from "@/hooks/use-auth-live-data";
import { flagSvgUrl } from "@/lib/countryFlag";

interface Props { feed: LiveFeedItem[] }

/** Pure CSS marquee. Mobile-safe — no JS rAF. */
function AuthLiveFeedTicker({ feed }: Props) {
  const items = (feed ?? []).slice(0, 16);
  const loop = items.length > 0 ? [...items, ...items] : [];

  return (
    <div className="relative w-full rounded-xl border border-gold/30 bg-background/95 overflow-hidden">
      <style>{`
        @keyframes auth-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .auth-marquee-track {
          animation: auth-marquee 60s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-marquee-track { animation: none; }
        }
      `}</style>

      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 pl-3 bg-gradient-to-r from-background via-background/95 to-transparent">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/15 border border-red-500/40 text-[9px] font-black tracking-[0.22em] text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE FEED
        </span>
      </div>

      <div className="overflow-hidden">
        <div className="auth-marquee-track flex whitespace-nowrap py-2 pl-[110px]">
          {loop.map((it, i) => {
            const url = flagSvgUrl(it.cc, 40);
            return (
              <span
                key={`${it.id}-${i}`}
                className="inline-flex items-center gap-1.5 px-4 text-[11px] sm:text-xs text-foreground/85"
              >
                {url ? (
                  <img
                    src={url}
                    width={18}
                    height={12}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    className="inline-block rounded-[2px] shadow-[0_0_0_1px_hsl(var(--gold)/0.25)]"
                  />
                ) : (
                  <span className="text-base leading-none">{it.flag}</span>
                )}
                <span className="truncate">{it.text}</span>
                <span className="mx-2 h-1 w-1 rounded-full bg-gold/60" />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(AuthLiveFeedTicker);
