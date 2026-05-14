import { useEffect, useState } from "react";
import { getActivePressSources, type PressSource } from "@/lib/inboundPress";

/**
 * "AS SEEN ON" — public press logos rail.
 * Hidden if no curated sources exist (no fake placeholders).
 */
export function AsSeenOnRail() {
  const [sources, setSources] = useState<PressSource[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getActivePressSources().then((s) => {
      setSources(s);
      setLoaded(true);
    });
  }, []);

  if (!loaded || sources.length === 0) return null;

  // Duplicate for seamless marquee
  const loop = [...sources, ...sources];

  return (
    <section className="border-y border-border/40 bg-background/60 backdrop-blur-sm py-6">
      <div className="container mx-auto px-4">
        <div className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
          As seen on
        </div>
        <div className="overflow-hidden relative">
          <div className="flex gap-10 animate-marquee whitespace-nowrap">
            {loop.map((s, i) => (
              <a
                key={`${s.domain}-${i}`}
                href={`https://${s.domain}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity shrink-0"
              >
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.display_name} className="h-6 w-auto object-contain" loading="lazy" />
                ) : (
                  <span className="text-sm font-semibold tracking-wide text-foreground/80">
                    {s.display_name}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
