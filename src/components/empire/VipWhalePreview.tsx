/**
 * VipWhalePreview — VIP-only rail showing whale strikes from last 30s.
 * Hidden for non-VIP. Polls every 10s. Empty state hidden.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Crown, ArrowDownToLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useVipPass } from "@/hooks/use-vip-pass";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Strike = {
  kind: "crown" | "withdraw";
  amount: number;
  label: string;
  nick: string;
  created_at: string;
};

export default function VipWhalePreview() {
  const vip = useVipPass();
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vip.loading || !vip.active) return;
    let mounted = true;
    async function load() {
      try {
        const { data, error } = await supabase.rpc("get_whale_strikes_vip_preview", { _limit: 8 });
        if (error || !mounted) return;
        setStrikes((data as Strike[]) ?? []);
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const t = setVisibleInterval(load, 10_000 , { meta: { owner: "VipWhalePreview", category: "cosmetic" } });
    return () => {
      mounted = false;
      t();
    };
  }, [vip.loading, vip.active]);

  if (vip.loading || !vip.active) return null;
  if (loading) return null;
  if (strikes.length === 0) return null;

  return (
    <Card className="border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-400/20">
        <div className="inline-flex items-center gap-2 text-[11px] font-imperial tracking-widest text-amber-200">
          <Eye className="w-3.5 h-3.5" /> VIP 30초 선공개
        </div>
        <span className="text-[10px] text-amber-100/60">일반 유저보다 30초 먼저</span>
      </div>
      <div className="p-2 flex flex-wrap gap-2">
        {strikes.map((s) => (
          <motion.div
            key={s.created_at + s.nick + s.kind}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-background/60 px-2.5 py-1 text-xs"
          >
            {s.kind === "crown" ? (
              <Crown className="w-3 h-3 text-amber-300" />
            ) : (
              <ArrowDownToLine className="w-3 h-3 text-emerald-300" />
            )}
            <span className="font-bold text-foreground">{s.nick}</span>
            <span className="text-amber-200 tabular-nums">
              {s.amount.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
