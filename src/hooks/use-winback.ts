import { useEffect } from "react";
import { useDB } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { isFlagOn } from "@/lib/conversion-flags";
import { track } from "@/lib/analytics";

const KEY_LAST_PUSH = "phonara_winback_last_push";
const KEY_FIRST_VISIT = "phonara_first_visit";
const PUSH_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Win-back loop:
 *  - 결제 후 24h: PRO 업그레이드 토스트
 *  - 7일 무결제 유저: 복귀 보너스 ₩3,000 토스트
 */
export function useWinback() {
  const [db] = useDB();
  useEffect(() => {
    if (!isFlagOn("winbackPush")) return;
    if (typeof window === "undefined") return;
    if (!db.user) return;

    const now = Date.now();
    const lastPush = Number(localStorage.getItem(KEY_LAST_PUSH) || 0);
    if (now - lastPush < PUSH_COOLDOWN_MS) return;

    let firstVisit = Number(localStorage.getItem(KEY_FIRST_VISIT) || 0);
    if (!firstVisit) {
      firstVisit = now;
      localStorage.setItem(KEY_FIRST_VISIT, String(now));
    }

    const u = db.user;
    const isPaid = u.tier !== "NORMAL";
    const daysSinceFirst = (now - firstVisit) / (24 * 60 * 60 * 1000);

    const t = setTimeout(() => {
      if (isPaid && daysSinceFirst >= 1) {
        toast({
          title: "🚀 PRO 업그레이드 시 적립 ×2",
          description: "오늘만 추가 ₩5,000 즉시 입금 보너스",
        });
        track("winback_paid_upsell_shown");
        localStorage.setItem(KEY_LAST_PUSH, String(now));
      } else if (!isPaid && daysSinceFirst >= 7) {
        toast({
          title: "💰 복귀 보너스 ₩3,000",
          description: "오늘 첫 미션 완료 시 자동 지급",
        });
        track("winback_returning_user_shown");
        localStorage.setItem(KEY_LAST_PUSH, String(now));
      }
    }, 4000);

    return () => clearTimeout(t);
  }, [db.user]);
}
