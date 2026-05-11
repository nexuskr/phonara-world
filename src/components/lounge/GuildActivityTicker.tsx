import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Users, Sword, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NICKS = [
  "민준","서연","도윤","하은","지호","유나","현우","수아","주원","지유","건우","서윤",
  "재민","채원","승현","지안","예준","서아","우진","하린","지환","민서","태윤","수빈",
  "강철멘탈","비트왕","코린이탈출","불꽃손가락","돈복사기","제국황제","서울맘","부산짠돌이",
  "30대대리","40대팀장","퇴직준비중","월급도둑","와이프몰래","두번째인생","주식왕","트레이딩여신"
];
const ACTIONS = [
  { v: "joined", emoji: "🚪", text: "에 입성", color: "text-secondary" },
  { v: "war", emoji: "⚔️", text: "에 전쟁 선포!", color: "text-destructive" },
  { v: "contrib", emoji: "🔥", text: "에 +{n}만 전투력 기여", color: "text-primary" },
  { v: "promote", emoji: "👑", text: "이(가) 길드장 자리 획득", color: "text-gold" },
  { v: "deposit", emoji: "💰", text: "길드 금고에 +{n}만원 입금", color: "text-money-strong" },
  { v: "win", emoji: "🏆", text: "전쟁 승리 — +{n}만원 분배", color: "text-money-strong" },
] as const;

type Feed = { id: string; line: string; color: string; emoji: string };

function rand<T>(a: readonly T[]): T { return a[Math.floor(Math.random() * a.length)]; }

export default function GuildActivityTicker() {
  const [guilds, setGuilds] = useState<{ name: string; emblem: string }[]>([]);
  const [feed, setFeed] = useState<Feed[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("guilds")
        .select("name, emblem")
        .order("total_power", { ascending: false })
        .limit(40);
      if (alive && data) setGuilds(data);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (guilds.length === 0) return;
    let tid: ReturnType<typeof setTimeout>;
    const tick = () => {
      const g = rand(guilds);
      const a = rand(ACTIONS);
      const n = (Math.floor(Math.random() * 480) + 20);
      const nick = rand(NICKS) + (Math.random() < 0.4 ? Math.floor(Math.random() * 999) : "");
      const line = `${nick}님이 ${g.emblem} ${g.name}${a.text.replace("{n}", String(n))}`;
      setFeed((prev) => [{ id: `${Date.now()}-${Math.random()}`, line, color: a.color, emoji: a.emoji }, ...prev].slice(0, 5));
      tid = setTimeout(tick, 1800 + Math.random() * 2200);
    };
    tick();
    return () => clearTimeout(tid);
  }, [guilds]);

  return (
    <div className="rounded-2xl border border-border/40 glass-strong p-3 overflow-hidden">
      <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-primary mb-2">
        <Flame className="w-3 h-3 animate-pulse" />
        실시간 길드 활동
        <span className="ml-auto inline-flex items-center gap-1 text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> LIVE
        </span>
      </div>
      <div className="relative h-[120px]">
        <AnimatePresence initial={false}>
          {feed.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1 - i * 0.18, y: i * 22 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-x-0 top-0 flex items-center gap-2 text-[11px] truncate"
            >
              <span>{f.emoji}</span>
              <span className={`truncate ${f.color}`}>{f.line}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
