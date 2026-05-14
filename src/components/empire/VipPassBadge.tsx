/**
 * VipPassBadge — small gold chip shown when current user has an active VIP Empire Pass.
 * Renders in PowerHeader / profile contexts. Hidden for non-VIP.
 */
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useVipPass } from "@/hooks/use-vip-pass";

export default function VipPassBadge({ compact = false }: { compact?: boolean }) {
  const { active, days_remaining, loading } = useVipPass();
  if (loading || !active) return null;

  return (
    <Link to="/vip" aria-label="VIP Empire Pass">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-amber-500/20 px-2 py-0.5 text-[10px] font-imperial tracking-widest text-amber-200 shadow-[0_0_18px_-4px_hsl(45_100%_55%/0.7)]"
      >
        <Sparkles className="w-3 h-3 text-amber-300" />
        VIP
        {!compact && (
          <span className="ml-1 text-[9px] tabular-nums text-amber-100/80">
            D-{Math.max(0, days_remaining)}
          </span>
        )}
      </motion.div>
    </Link>
  );
}
