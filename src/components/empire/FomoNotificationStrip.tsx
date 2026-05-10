import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Flame, X, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFomoNotifications } from "@/hooks/use-fomo-notifications";

const kindAccent: Record<string, string> = {
  recovery: "from-destructive/15 to-primary/10 border-destructive/40",
  loss_streak: "from-destructive/15 to-transparent border-destructive/40",
  inactive: "from-primary/15 to-transparent border-primary/40",
  war_started: "from-accent/15 to-destructive/10 border-accent/40",
  jackpot_near: "from-primary/20 to-accent/10 border-primary/50",
  referral_used: "from-accent/15 to-transparent border-accent/40",
  empire_promo: "from-primary/15 to-transparent border-primary/40",
  market_event: "from-primary/15 to-transparent border-primary/40",
};

export function FomoNotificationStrip() {
  const nav = useNavigate();
  const { unread, markRead } = useFomoNotifications();
  const top = unread.slice(0, 3);

  if (top.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence initial={false}>
        {top.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <Card
              className={`p-3 border bg-gradient-to-r ${kindAccent[n.kind] ?? "from-primary/10 to-transparent border-primary/30"}`}
            >
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="mt-1 text-primary"
                >
                  <Flame className="h-4 w-4" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                </div>
                <div className="flex items-center gap-1">
                  {n.cta_url && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7"
                      onClick={() => {
                        void markRead(n.id);
                        nav(n.cta_url!);
                      }}
                    >
                      {n.cta_label ?? "이동"} <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => void markRead(n.id)}
                    aria-label="닫기"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
