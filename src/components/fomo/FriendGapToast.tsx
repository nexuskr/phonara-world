import { useEffect } from "react";
import { useFriendGap } from "@/hooks/use-friend-ranking";
import { notify } from "@/lib/notify";
import { FRIEND_GAP_DEDUPE_MS, FRIEND_GAP_TOAST_KEY } from "@/lib/fomo";

/**
 * FriendGapToast — 친구 격차를 Warm King 톤으로 24h 1회 토스트.
 *   - direction === "ahead" : "친구보다 N PHON 더 벌었어요"
 *   - direction === "behind": "조금만 더 하면 친구를 추월하실 수 있습니다"
 */
export default function FriendGapToast() {
  const gap = useFriendGap();

  useEffect(() => {
    if (!gap || gap.direction === "alone") return;
    if (gap.gap_phon <= 0) return;
    try {
      const last = Number(localStorage.getItem(FRIEND_GAP_TOAST_KEY) ?? 0);
      if (Date.now() - last < FRIEND_GAP_DEDUPE_MS) return;
      localStorage.setItem(FRIEND_GAP_TOAST_KEY, String(Date.now()));
    } catch { /* private mode — fall through */ }

    const amt = gap.gap_phon.toLocaleString();
    if (gap.direction === "ahead") {
      notify.success(`👑 폐하께서는 ${gap.other_nickname} 황제보다 ${amt} PHON 앞서 계십니다`);
    } else {
      notify.info(`⚔️ ${gap.other_nickname} 황제가 ${amt} PHON 앞서 있습니다. 추월의 기회입니다`);
    }
  }, [gap]);

  return null;
}
