import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDB } from "@/lib/store";

type Props = {
  size?: "lg" | "md";
  className?: string;
  loggedOutLabel?: string;
  unDepositedLabel?: string;
  depositedLabel?: string;
};

/**
 * "1버튼 첫입금" 통합 CTA
 * 상태에 따라 경로/라벨 자동 분기:
 *  - 비로그인 → /auth?next=/wallet?intent=first-deposit&tab=deposit
 *  - 로그인 + 미입금 → /wallet?intent=first-deposit&tab=deposit
 *  - 로그인 + 입금 1회+ → /arena (실전 베팅 직행)
 */
export default function DepositCTA({
  size = "lg",
  className = "",
  loggedOutLabel = "1분 안에 시작하고 보상받기",
  unDepositedLabel = "지금 시작하고 +30% 보너스 받기",
  depositedLabel = "지금 베팅하고 더 받기",
}: Props) {
  const [db] = useDB();
  const isLoggedIn = !!db.user?.id;
  const [hasDeposited, setHasDeposited] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { setHasDeposited(false); return; }
    // local store first (instant)
    if ((db.deposits?.length ?? 0) > 0) { setHasDeposited(true); return; }
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setHasDeposited(false); return; }
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("kind", "deposit");
      if (alive) setHasDeposited((count ?? 0) > 0);
    })();
    return () => { alive = false; };
  }, [isLoggedIn, db.deposits?.length]);

  let href = "/auth?next=" + encodeURIComponent("/wallet?intent=first-deposit&tab=deposit");
  let label = loggedOutLabel;

  if (isLoggedIn) {
    if (hasDeposited) {
      href = "/arena";
      label = depositedLabel;
    } else {
      href = "/wallet?intent=first-deposit&tab=deposit";
      label = unDepositedLabel;
    }
  }

  const padding = size === "lg" ? "min-h-[64px] text-lg" : "min-h-[52px] text-base";

  return (
    <Link
      to={href}
      className={`press sheen w-full ${padding} rounded-2xl bg-gradient-gold text-gold-foreground font-display font-black flex items-center justify-center gap-2 glow-gold ${className}`}
    >
      <Flame className="w-5 h-5" />
      {label}
      <ArrowRight className="w-5 h-5" />
    </Link>
  );
}
