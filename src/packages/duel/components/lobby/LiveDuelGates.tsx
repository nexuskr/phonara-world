/**
 * LiveDuelGates — Center wing: 4 cinematic Duel cards.
 * Sprint 4 PR-2: duel-card-glass + duel-pulse-ring + haptic + DynamicIsland.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Swords, Flame, ChevronRight } from "lucide-react";
import type { DuelRoom } from "@pkg/duel";
import { HeatLevelBadge } from "./HeatLevelBadge";
import { SpectatorCount } from "./SpectatorCount";
import { triggerHaptic } from "@/packages/native";
import { dynamicIsland } from "@/packages/native/useDynamicIsland";

const OBJECT_GLYPH: Record<string, string> = { wheel: "◎", card: "♛", dice: "⚀" };

function DuelCard({ room, idx }: { room: DuelRoom; idx: number }) {
  const isHot = room.heat >= 3;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, rotateX: 1.4, rotateY: -1.4 }}
      style={{ willChange: "transform", transformStyle: "preserve-3d" }}
      className="group"
    >
      <Link
        to={`/duel/arena/${room.id}`}
        onClick={() => {
          triggerHaptic("light");
          dynamicIsland.show({ kind: "loading", text: `${room.title} 입장 중…`, ttl: 1800 });
        }}
        className={[
          "duel-card-glass relative block overflow-hidden rounded-3xl p-4",
          "active:scale-[0.985] transition-transform",
          isHot ? "duel-pulse-ring" : "",
        ].join(" ")}
        style={{ transition: "transform 140ms cubic-bezier(.2,.8,.2,1)" }}
      >
        {/* 3-layer corner glow (snapshot, no animation) */}
        <span aria-hidden className="pointer-events-none absolute -inset-px rounded-3xl"
              style={{ boxShadow: "inset 0 0 0 1px hsl(38 92% 60% / 0.18), 0 0 22px hsl(38 92% 56% / 0.10), 0 0 44px hsl(330 90% 60% / 0.06)" }} />
        <div className="flex items-center justify-between gap-2">
          <HeatLevelBadge level={room.heat} />
          <SpectatorCount value={room.spectators} />
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Duelist side="left" emoji={room.left.emoji} nick={room.left.nickname} tier={room.left.tier} color={room.left.color} />
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-12 h-12 rounded-2xl grid place-items-center text-2xl"
              style={{
                background: "radial-gradient(circle at 30% 30%, #F5C51844, #0A0503)",
                boxShadow: "0 0 16px hsl(38 92% 60% / 0.55), 0 0 30px hsl(330 90% 60% / 0.25)",
              }}
            >
              <span className="font-imperial text-amber-200" style={{ textShadow: "0 0 10px hsl(38 92% 60% / 0.6)" }}>
                {OBJECT_GLYPH[room.object]}
              </span>
            </div>
            <span className="text-[9px] tracking-[0.2em] font-black text-pink-300/90 uppercase">VS</span>
          </div>
          <Duelist side="right" emoji={room.right.emoji} nick={room.right.nickname} tier={room.right.tier} color={room.right.color} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.24em] font-black uppercase text-amber-300/70">{room.title}</div>
            <div className="text-[11px] text-amber-100/90 font-bold tabular-nums">
              상금 {room.stake.toLocaleString()} PHON · 잭팟 {Math.round(room.jackpotPct)}%
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-200">
            <Flame className="w-3.5 h-3.5 text-pink-400" />
            {room.startsInSec}s
            <ChevronRight className="w-4 h-4 text-amber-300 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function Duelist({ emoji, nick, tier, color }: { side: string; emoji: string; nick: string; tier: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="w-10 h-10 rounded-xl grid place-items-center text-xl shrink-0"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}, #0A0503)`,
          boxShadow: `0 0 12px ${color}66, inset 0 0 6px ${color}33`,
        }}
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-amber-100 truncate">{nick}</div>
        <div className="text-[9px] tracking-[0.18em] font-black uppercase text-amber-400/70">T{tier}</div>
      </div>
    </div>
  );
}

export function LiveDuelGates({ rooms }: { rooms: DuelRoom[] }) {
  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[10px] tracking-[0.32em] font-black uppercase text-amber-400/85">
            Live Duel Gates
          </div>
          <h2 className="font-imperial text-2xl md:text-3xl text-amber-100 leading-tight">
            지금 펼쳐지는 황제의 결투
          </h2>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-pink-300">
          <Swords className="w-4 h-4" /> 실시간
        </span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rooms.map((r, i) => <DuelCard key={r.id} room={r} idx={i} />)}
      </div>
    </section>
  );
}

export default LiveDuelGates;
