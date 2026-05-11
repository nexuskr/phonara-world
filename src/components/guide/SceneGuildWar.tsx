import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Swords, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoldNebulaBg, AnimatedCounter, SimBadge, senior } from "./EmpireFX";

type GuildRow = { id: string; name: string; emblem: string; total_power: number; member_count: number };

/**
 * Phase 5 / 씬 — GUILD WAR TOP 3 + 상금 풀 카운터
 * guilds 테이블 public_read RLS 사용. 실데이터 비면 SIM 시드.
 */
export function SceneGuildWar({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  const [guilds, setGuilds] = useState<GuildRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("guilds")
        .select("id,name,emblem,total_power,member_count")
        .order("total_power", { ascending: false })
        .limit(3);
      if (alive && data && data.length > 0) setGuilds(data as GuildRow[]);
    })();
    return () => { alive = false; };
  }, []);

  const display: GuildRow[] = guilds.length > 0 ? guilds : [
    { id: "s1", name: "황금제국", emblem: "👑", total_power: 18_420_000, member_count: 28 },
    { id: "s2", name: "흑룡기사단", emblem: "🐉", total_power: 14_280_000, member_count: 24 },
    { id: "s3", name: "백호연합", emblem: "🐯", total_power: 11_840_000, member_count: 22 },
  ];

  return (
    <section data-large={large} className="snap-start snap-always min-h-[calc(100dvh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-12">
      <GoldNebulaBg tone="gold" />
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/50 text-[10px] font-black tracking-[0.3em] text-gold mb-3">
            <Swords className="w-3 h-3 animate-pulse" /> 길드 전쟁 시즌 LIVE
          </div>
          <h2 className={`font-imperial text-3xl sm:text-4xl break-keep leading-[1.15] ${senior.h2}`}>
            혼자가 아닌<br />
            <span className="text-gradient-gold drop-shadow-[0_0_18px_hsl(var(--gold)/0.5)]">길드로 1위를 차지하세요</span>
          </h2>
        </div>

        {/* 상금 풀 */}
        <div className="glass-strong rounded-2xl border border-gold/40 px-4 py-4 text-center mb-4">
          <div className="text-[10px] tracking-[0.3em] font-black text-gold/80 mb-1 flex items-center justify-center gap-1.5">
            <Trophy className="w-3 h-3" /> 이번 시즌 상금 풀 <SimBadge />
          </div>
          <div className={`font-imperial text-3xl text-gradient-gold ${senior.h2}`}>
            ₩<AnimatedCounter to={142_800_000} duration={2.2} jitter={15_000} />
          </div>
          <div className={`text-[11px] text-muted-foreground mt-1 break-keep ${senior.body}`}>
            우승 길드 멤버에게 기여도 비례 자동 분배
          </div>
        </div>

        {/* TOP 3 */}
        <div className="space-y-2.5 mb-4">
          {display.map((g, i) => (
            <motion.div
              key={g.id}
              initial={reduce ? false : { opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1 }}
              className={`glass-strong rounded-2xl p-3 flex items-center gap-3 border ${i === 0 ? "border-gold/60 shadow-[0_0_18px_hsl(var(--gold)/0.3)]" : "border-gold/20"}`}
            >
              <div className={`text-[10px] tracking-widest font-black w-6 text-center ${i === 0 ? "text-gold" : "text-muted-foreground"}`}>
                #{i + 1}
              </div>
              <div className="text-2xl">{g.emblem}</div>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm break-keep ${senior.body}`}>{g.name}</div>
                <div className="text-[10px] text-muted-foreground">멤버 {g.member_count}명</div>
              </div>
              <div className="text-right">
                <div className="font-imperial font-black text-gold tabular-nums">{g.total_power.toLocaleString()}</div>
                <div className="text-[9px] text-muted-foreground tracking-widest">POWER</div>
              </div>
            </motion.div>
          ))}
        </div>

        <Link
          data-large={large}
          to="/lounge?tab=guild"
          className={`press w-full inline-flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-gradient-imperial text-gold-foreground font-display font-black glow-gold ${senior.btn}`}
        >
          <Swords className="w-5 h-5" /> 지금 길드 찾기 →
        </Link>
      </div>
    </section>
  );
}
