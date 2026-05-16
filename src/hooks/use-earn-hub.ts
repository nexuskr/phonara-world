import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify, describeError } from "@/lib/notify";

export type QuickKind = "mission_play" | "mission_invite" | "mission_deposit" | "play_today";
export type ShareChannel = "instagram" | "tiktok" | "youtube" | "x" | "naver" | "kakao" | "line" | "copy";

export interface EarnHubState {
  ok: boolean;
  today_earned: number;
  streak: { days: number; claimed_today: boolean; next_reward: number };
  missions: {
    play: { claimed: boolean; amount: number };
    invite: { claimed: boolean; amount: number };
    deposit: { claimed: boolean; amount: number };
  };
  play_today: { claimed: boolean; amount: number };
  share_today: { channels: string[]; amount_each: number };
  referral: { code: string; invited: number; earned_total: number };
}

const EMPTY: EarnHubState = {
  ok: false,
  today_earned: 0,
  streak: { days: 0, claimed_today: false, next_reward: 100 },
  missions: {
    play: { claimed: false, amount: 100 },
    invite: { claimed: false, amount: 150 },
    deposit: { claimed: false, amount: 300 },
  },
  play_today: { claimed: false, amount: 80 },
  share_today: { channels: [], amount_each: 200 },
  referral: { code: "", invited: 0, earned_total: 0 },
};

export function useEarnHub() {
  const [state, setState] = useState<EarnHubState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_earn_hub_state" as any);
    if (error) return;
    if (!mounted.current) return;
    if (data && (data as any).ok) setState(data as unknown as EarnHubState);
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const claimAttendance = useCallback(async () => {
    if (state.streak.claimed_today) return;
    const prev = state;
    setState((s) => ({
      ...s,
      streak: { ...s.streak, claimed_today: true },
      today_earned: s.today_earned + s.streak.next_reward,
    }));
    const { data, error } = await supabase.rpc("claim_daily_attendance", {
      user_id: (await supabase.auth.getUser()).data.user?.id as string,
    } as any);
    if (error) {
      setState(prev);
      notify.fail("출석 실패", error);
      return;
    }
    const reward = Array.isArray(data) ? (data[0] as any)?.reward : (data as any)?.reward;
    notify.success(`출석 완료 +${Number(reward ?? 0).toLocaleString()} PHON`);
    refresh();
  }, [state, refresh]);

  const claim = useCallback(
    async (kind: QuickKind) => {
      const map = { mission_play: "play", mission_invite: "invite", mission_deposit: "deposit" } as const;
      const isMission = kind in map;
      const currentClaimed = isMission
        ? (state.missions as any)[map[kind as keyof typeof map]].claimed
        : state.play_today.claimed;
      if (currentClaimed) return;

      const amount = isMission
        ? (state.missions as any)[map[kind as keyof typeof map]].amount
        : state.play_today.amount;

      const prev = state;
      setState((s) => {
        const next = { ...s, today_earned: s.today_earned + amount };
        if (isMission) {
          const k = map[kind as keyof typeof map];
          next.missions = {
            ...s.missions,
            [k]: { ...(s.missions as any)[k], claimed: true },
          } as any;
        } else {
          next.play_today = { ...s.play_today, claimed: true };
        }
        return next;
      });

      const { data, error } = await supabase.rpc("claim_daily_quick_reward" as any, { _kind: kind });
      if (error) {
        setState(prev);
        notify.fail("보상 실패", error);
        return;
      }
      const d = data as any;
      if (d?.already_claimed) {
        notify.info("이미 받은 보상이에요");
      } else if (d?.ok) {
        notify.success(`+${Number(d.amount).toLocaleString()} PHON 적립 완료`);
      } else {
        setState(prev);
        notify.error(describeError(d?.error));
      }
    },
    [state],
  );

  const claimShare = useCallback(
    async (channel: ShareChannel) => {
      const key = `share_${channel}`;
      if (state.share_today.channels.includes(key)) return { already: true };
      const amount = state.share_today.amount_each;
      const prev = state;
      setState((s) => ({
        ...s,
        share_today: { ...s.share_today, channels: [...s.share_today.channels, key] },
        today_earned: s.today_earned + amount,
      }));
      const { data, error } = await supabase.rpc("claim_share_reward" as any, { _channel: channel });
      if (error) {
        setState(prev);
        notify.fail("공유 보상 실패", error);
        return { error };
      }
      const d = data as any;
      if (d?.ok && !d?.already_claimed) {
        notify.success(`+${Number(d.amount).toLocaleString()} PHON 공유 보상`);
      }
      return { ok: true, data: d };
    },
    [state],
  );

  return { state, loading, refresh, claim, claimShare, claimAttendance };
}
