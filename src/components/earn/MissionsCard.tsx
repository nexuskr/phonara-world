import { motion } from "framer-motion";
import { Target, Check } from "lucide-react";
import type { QuickKind } from "@/hooks/use-earn-hub";

interface Mission { kind: QuickKind; label: string; sub: string; amount: number; claimed: boolean; }

interface Props {
  missions: {
    play: { claimed: boolean; amount: number };
    invite: { claimed: boolean; amount: number };
    deposit: { claimed: boolean; amount: number };
  };
  onClaim: (kind: QuickKind) => void;
}

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
          <div className="text-base font-bold text-foreground">오늘의 미션 3종</div>
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
      </ul>
    </motion.div>
  );
}
