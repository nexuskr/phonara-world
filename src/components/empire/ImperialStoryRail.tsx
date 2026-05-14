import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Sparkles, Gem, Castle, Rocket, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

type Story = {
  id: number;
  kind: string;
  headline: string;
  subline: string | null;
  hero_nickname: string | null;
  payload: any;
  created_at: string;
};

const ICON: Record<string, any> = {
  new_emperor: Crown,
  jackpot: Gem,
  baron_promotion: Castle,
  galaxy_seat: Rocket,
  founding_seat: Trophy,
  crown_war_finale: Sparkles,
};

const KIND_LINK: Record<string, string> = {
  galaxy_seat: "/empire/galaxy",
  jackpot: "/empire/atelier",
  baron_promotion: "/empire/collection",
  new_emperor: "/empire",
  founding_seat: "/empire/my-seat",
  crown_war_finale: "/empire",
};

export default function ImperialStoryRail() {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_imperial_stories", { _limit: 20 });
      if (mounted && Array.isArray(data)) setStories(data as Story[]);
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, []);

  if (!stories.length) return null;
  const loop = [...stories, ...stories];

  return (
    <section
      aria-label="Imperial Stories"
      className="relative rounded-2xl border border-primary/30 bg-gradient-to-r from-background/60 via-card/60 to-background/60 backdrop-blur-md overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] tracking-[0.3em] font-black text-primary/90">IMPERIAL STORIES · LIVE</span>
      </div>
      <div className="relative py-2.5 overflow-hidden">
        <motion.div
          className="flex gap-3 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 60, ease: "linear", repeat: Infinity }}
        >
          {loop.map((s, i) => {
            const Icon = ICON[s.kind] ?? Sparkles;
            const href = KIND_LINK[s.kind] ?? "/empire";
            return (
              <Link
                key={`${s.id}-${i}`}
                to={href}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/40 bg-card/70 hover:border-primary/60 hover:bg-card transition-all"
              >
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground">{s.headline}</span>
                {s.subline && (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">· {s.subline}</span>
                )}
              </Link>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
