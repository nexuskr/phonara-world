import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { Link } from "react-router-dom";
import SlimShell from "@/components/layout/SlimShell";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useEarnHub } from "@/hooks/use-earn-hub";
import StreakCard from "@/components/earn/StreakCard";
import MissionsCard from "@/components/earn/MissionsCard";
import ReferralCard from "@/components/earn/ReferralCard";
import PlayToEarnCard from "@/components/earn/PlayToEarnCard";
import ShareRewardCard from "@/components/earn/ShareRewardCard";
import RouletteCard from "@/components/earn/RouletteCard";
import VipBoostCard from "@/components/earn/VipBoostCard";
import ShareChannelsSheet from "@/components/share/ShareChannelsSheet";
import { G } from "@/lib/glossary";
import { setVisibleInterval } from "@/lib/util/visible-interval";

function useLiveEarners(min = 1100, max = 1450) {
  const [n, setN] = useState(() => min + Math.floor(Math.random() * (max - min)));
  useEffect(() => {
    const i = setVisibleInterval(() => {
      setN((p) => {
        const next = p + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 7);
        return Math.max(min, Math.min(max, next));
      });
    }, 60_000 , { meta: { owner: "Earn", category: "cosmetic" } });
    return () => i();
  }, [min, max]);
  return n;
}

function useCountUp(target: number, ms = 600) {
  const [n, setN] = useState(target);
  useEffect(() => {
    if (n === target) return;
    const start = n;
    const startedAt = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startedAt) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return n;
}

export default function Earn() {
  const user = useRequireAuth();
  const { state, loading, claim, claimAttendance, refresh } = useEarnHub();
  const earned = useCountUp(state.today_earned);
  const livePlayers = useLiveEarners();
  const [shareOpen, setShareOpen] = useState(false);

  if (!user) return null;

  const roul = state.roulette ?? { spun_today: false, last_amount: 0, multiplier: 1 };
  const vip = state.vip_boost ?? { active: false, multiplier: 1, ends_at: null };

  return (
    <SlimShell>
      <div className="container py-5 space-y-5 max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-primary/30 bg-card p-6 relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="flex items-end justify-between gap-3 relative">
            <div>
              <div className="text-[10px] tracking-[0.3em] font-black text-primary uppercase">매일 무료 수익</div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground mt-1">{G.earnHeader}</h1>
              <p className="text-xs text-muted-foreground mt-1">{G.earnSubheader}</p>
            </div>
            <Link
              to="/events"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 bg-background/40 text-xs font-bold text-primary"
            >
              <Gift className="w-3.5 h-3.5" /> 이벤트
            </Link>
          </div>

          <div className="mt-5 flex items-end gap-2 relative">
            <div className="text-5xl md:text-6xl font-black text-primary tabular-nums leading-none">
              {earned.toLocaleString()}
            </div>
            <div className="text-lg font-bold text-foreground/70 pb-1">PHON</div>
          </div>
          <div className="text-sm text-muted-foreground mt-1 font-medium">
            {G.earnTodayLabel} · {G.earnFomoLive.replace("{n}", livePlayers.toLocaleString())}
          </div>
        </motion.header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl border border-border/40 bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <StreakCard
              days={state.streak.days}
              claimedToday={state.streak.claimed_today}
              nextReward={state.streak.next_reward}
              onClaim={claimAttendance}
            />
            <MissionsCard missions={state.missions} onClaim={claim} />
            <RouletteCard
              spunToday={roul.spun_today}
              lastAmount={roul.last_amount}
              multiplier={roul.multiplier}
              onSpun={() => refresh()}
            />
            <ReferralCard
              code={state.referral.code}
              invited={state.referral.invited}
              earnedTotal={state.referral.earned_total}
            />
            <PlayToEarnCard
              claimed={state.play_today.claimed}
              amount={state.play_today.amount}
              onClaim={() => claim("play_today")}
            />
            <VipBoostCard active={vip.active} multiplier={vip.multiplier} endsAt={vip.ends_at} />
            <div onClick={() => setShareOpen(true)} className="cursor-pointer">
              <ShareRewardCard
                claimedChannels={state.share_today.channels}
                amountEach={state.share_today.amount_each}
              />
            </div>
          </div>
        )}
      </div>

      <ShareChannelsSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        kind="bigwin"
        amount={state.today_earned}
        referralCode={state.referral.code}
        onClaimed={() => refresh()}
      />
    </SlimShell>
  );
}
