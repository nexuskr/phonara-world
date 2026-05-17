import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Check, Users, Sparkles, HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { QuickKind } from "@/hooks/use-earn-hub";
import { useMissionRecovery, applyRecoveryBonus } from "@/hooks/use-mission-recovery";

interface Mission { kind: QuickKind; label: string; sub: string; amount: number; claimed: boolean; }

interface Props {
  missions: {
    play: { claimed: boolean; amount: number };
    invite: { claimed: boolean; amount: number };
    deposit: { claimed: boolean; amount: number };
  };
  onClaim: (kind: QuickKind) => void;
}

const GUILD_CLAIM_KEY = "phonara:mission_guild_claimed_v1";

export default function MissionsCard({ missions, onClaim }: Props) {
  const items: Mission[] = [
    { kind: "mission_play", label: "오늘 게임 1판 하기", sub: "어떤 게임이든 OK", ...missions.play },
    { kind: "mission_invite", label: "친구 1명 초대 링크 공유", sub: "공유만 해도 보상", ...missions.invite },
    { kind: "mission_deposit", label: "첫 입금 인증", sub: "오늘 처음 충전 시", ...missions.deposit },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col gap-4"
    >
      <header className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-secondary/20 text-secondary-foreground flex items-center justify-center">
          <Target className="w-5 h-5" />
        </span>
        <div>
          <div className="text-base font-bold text-foreground">오늘의 미션 3종 + 길드</div>
          <div className="text-xs text-muted-foreground">5분 안에 다 받을 수 있어요</div>
        </div>
      </header>

      <ul className="space-y-2.5">
        {items.map((m) => (
          <li
            key={m.kind}
            className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground truncate">{m.label}</div>
              <div className="text-[11px] text-muted-foreground">{m.sub}</div>
            </div>
            <div className="text-sm font-black text-primary tabular-nums">+{m.amount}</div>
            <button
              onClick={() => onClaim(m.kind)}
              disabled={m.claimed}
              className="h-11 min-w-[88px] px-3 rounded-lg font-bold text-sm bg-primary text-primary-foreground disabled:bg-muted/40 disabled:text-muted-foreground active:scale-[0.98] transition"
            >
              {m.claimed ? <Check className="w-4 h-4 inline" /> : "받기"}
            </button>
          </li>
        ))}
        <GuildMissionRow />
      </ul>
    </motion.div>
  );
}

function GuildMissionRow() {
  const [joined, setJoined] = useState<boolean | null>(null);
  const [claimed, setClaimed] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem(GUILD_CLAIM_KEY) === "1",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.rpc("get_my_guild" as any);
        if (!alive) return;
        const has = !!(data && (Array.isArray(data) ? data.length : (data as any)?.guild_id));
        setJoined(has);
      } catch {
        if (alive) setJoined(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function claim() {
    if (busy || claimed) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc(
        "claim_daily_quick_reward" as any,
        { _kind: "mission_guild" } as any,
      );
      if (error) throw error;
      const d = data as any;
      if (d?.already_claimed) {
        localStorage.setItem(GUILD_CLAIM_KEY, "1");
        setClaimed(true);
        notify.info("이미 받은 보상이에요");
      } else if (d?.ok) {
        localStorage.setItem(GUILD_CLAIM_KEY, "1");
        setClaimed(true);
        notify.success(`+${Number(d.amount ?? 500).toLocaleString()} PHON 길드 보상`);
      } else {
        notify.error(d?.error ?? "보상 실패");
      }
    } catch (e: any) {
      notify.error(e?.message ?? "보상 실패");
    } finally { setBusy(false); }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-background/40 to-pink-500/10 p-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-foreground truncate inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-300" />
          길드 가입 (1회)
        </div>
        <div className="text-[11px] text-muted-foreground">
          {joined === false ? "먼저 길드에 들어가야 받을 수 있어요" : "가입했다면 바로 받기"}
        </div>
      </div>
      <div className="text-sm font-black text-amber-300 tabular-nums">+500</div>
      {joined === false ? (
        <Link
          to="/guild"
          className="h-11 min-w-[88px] px-3 rounded-lg font-bold text-sm bg-amber-500 text-black active:scale-[0.98] transition inline-flex items-center justify-center"
        >
          길드 가기
        </Link>
      ) : (
        <button
          onClick={claim}
          disabled={claimed || busy || joined === null}
          className="h-11 min-w-[88px] px-3 rounded-lg font-bold text-sm bg-amber-500 text-black disabled:bg-muted/40 disabled:text-muted-foreground active:scale-[0.98] transition"
        >
          {claimed ? <Check className="w-4 h-4 inline" /> : busy ? "..." : "받기"}
        </button>
      )}
    </li>
  );
}
