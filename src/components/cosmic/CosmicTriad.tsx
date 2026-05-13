import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Users, Crown } from "lucide-react";
import { useDB, formatKRW } from "@/lib/store";
import { useOnline, useTodayPayout } from "@/components/LiveStats";

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const dur = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{format(n)}</span>;
}

const cards = [
  { key: "payout", icon: Wallet, micro: "TODAY", label: "오늘 출금액" },
  { key: "online", icon: Users, micro: "LIVE", label: "활동 중인 황제" },
  { key: "level", icon: Crown, micro: "YOU", label: "내 제국 레벨" },
] as const;

export default function CosmicTriad() {
  const [db] = useDB();
  const user = db.user;
  const online = useOnline();
  const today = useTodayPayout();
  const level = user?.level ?? 1;

  const values: Record<string, { v: number; f: (n: number) => string }> = {
    payout: { v: today, f: (n) => formatKRW(n) },
    online: { v: online, f: (n) => `${n.toLocaleString()}명` },
    level: { v: level, f: (n) => `Lv.${n}` },
  };

  return (
    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const { v, f } = values[c.key];
        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 + i * 0.12, duration: 0.7 }}
            className="relative overflow-hidden rounded-2xl p-5 md:p-6 border border-gold/40"
            style={{
              background:
                "linear-gradient(135deg, hsl(240 35% 8% / 0.85) 0%, hsl(258 50% 10% / 0.7) 100%)",
              boxShadow:
                "0 0 28px -6px hsl(var(--gold) / 0.45), inset 0 1px 0 hsl(var(--gold) / 0.25)",
            }}
          >
            <span
              aria-hidden
              className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
            />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center">
                <Icon className="w-4 h-4 text-gold" />
              </div>
              <span className="text-[9px] tracking-[0.4em] text-gold/80 font-black">
                {c.micro}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">{c.label}</div>
            <div
              className="mt-1 font-display font-black text-3xl md:text-4xl leading-none text-money-strong"
              style={{ textShadow: "0 0 20px hsl(var(--gold) / 0.35)" }}
            >
              <CountUp value={v} format={f} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
