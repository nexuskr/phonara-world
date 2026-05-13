import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Moment = {
  id: string;
  message: string;
  amount: number | null;
  kind: string;
  created_at: string;
};

/**
 * EmpireMomentToast — global broadcast layer.
 * Listens to ghost_moments inserts via Realtime and pops a transient gold toast
 * top-center. All entries are simulation; SIM chip is shown inline.
 */
export default function EmpireMomentToast() {
  const [current, setCurrent] = useState<Moment | null>(null);
  const queueRef = useRef<Moment[]>([]);
  const showingRef = useRef(false);

  function showNext() {
    if (showingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    showingRef.current = true;
    setCurrent(next);
    setTimeout(() => {
      setCurrent(null);
      showingRef.current = false;
      // brief gap
      setTimeout(showNext, 400);
    }, 5200);
  }

  useEffect(() => {
    const channel = supabase
      .channel("ghost_moments_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ghost_moments" },
        (payload) => {
          const m = payload.new as Moment;
          // Cap queue so we don't spam if user backgrounds tab.
          if (queueRef.current.length < 3) queueRef.current.push(m);
          showNext();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[70] pointer-events-none w-full max-w-md px-3">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ y: -30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-xl border border-sim-gold/60 bg-gradient-to-r from-amber-950/90 via-background/95 to-amber-950/90 backdrop-blur-md shadow-[0_8px_32px_-8px_rgba(245,158,11,0.6)] px-4 py-2.5 flex items-center gap-3"
            role="status"
            aria-live="polite"
          >
            <Crown className="w-5 h-5 text-sim-gold animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground truncate">
                {current.message}
              </div>
              <div className="text-[10px] tracking-wider uppercase text-sim-gold/80 mt-0.5">
                Empire Moment · Simulation
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border bg-sim-gold/15 text-sim-gold border-sim-gold/40">
              SIM
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
